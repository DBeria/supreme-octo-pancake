// client/src/pages/LessonView.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import {
  ChevronDown as ChevronDownIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";

// -------------------- helpers --------------------
const keyLS = (courseId, lessonId) => `progress:${courseId}:${lessonId}`;
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

const parseYouTubeId = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/");
    return parts.includes("embed") ? parts[parts.length - 1] : null;
  } catch {
    return null;
  }
};

// -------------------- component --------------------
const LessonView = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // data
  const [course, setCourse] = useState(null);
  const [user, setUser] = useState(null);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openLessons, setOpenLessons] = useState({});

  // position
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // quiz
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isFinalExamPassed, setIsFinalExamPassed] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [shuffledPrompts, setShuffledPrompts] = useState([]);

  // certificate
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const certificateRef = useRef(null);

  // fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef(null);

  const activeLesson = course?.lessons?.[activeLessonIndex];
  const activeSlide = activeLesson?.slides?.[activeSlideIndex];
  const isFinalExamLesson = Boolean(activeLesson?.isFinalExam);
  const hasPassedFinalExamBefore =
    user?.completedCourses?.some((c) => c.courseId === courseId && c.passedFinalExam) || false;

  // -------- initial slide from ?slide= or localStorage --------
  const initialSlideIndex = useMemo(() => {
    const url = new URL(window.location.href);
    const qs = url.searchParams.get("slide");
    if (qs && !Number.isNaN(Number(qs))) return Math.max(0, Number(qs));
    try {
      const raw = localStorage.getItem(keyLS(courseId, lessonId));
      if (raw) {
        const { index } = JSON.parse(raw);
        if (Number.isInteger(index)) return index;
      }
    } catch (_) {}
    return 0;
  }, [courseId, lessonId]);

  // -------- fetch course + user --------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [courseRes, userRes] = await Promise.all([
          axios.get(`/api/courses/${courseId}`, config),
          axios.get(`/api/users/profile`, config),
        ]);

        if (!alive) return;

        const crs = courseRes.data;
        const usr = userRes.data;
        setCourse(crs);
        setUser(usr);

        // focus lesson from URL param
        if (lessonId) {
          const idx = crs.lessons.findIndex((l) => l._id === lessonId);
          if (idx !== -1) {
            setActiveLessonIndex(idx);
            setOpenLessons((prev) => ({ ...prev, [idx]: true }));
          }
        }
      } catch (e) {
        if (alive) setError("Failed to load course or user profile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [courseId, lessonId]);

  // -------- ensure slide index in range on lesson change --------
  useEffect(() => {
    if (!activeLesson) return;
    const max = Math.max(0, (activeLesson.slides?.length || 1) - 1);
    setActiveSlideIndex((i) => clamp(i ?? initialSlideIndex, 0, max));
    // reflect URL and LS when lesson changes
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(clamp(activeSlideIndex, 0, max)));
    window.history.replaceState({}, "", url);
  }, [activeLesson]); // eslint-disable-line

  // -------- persist progress & reflect in URL on slide change --------
  useEffect(() => {
    if (!course || !activeLesson) return;
    try {
      localStorage.setItem(
        keyLS(courseId, activeLesson._id || lessonId),
        JSON.stringify({ index: activeSlideIndex })
      );
    } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(activeSlideIndex));
    window.history.replaceState({}, "", url);
  }, [activeSlideIndex, courseId, activeLesson, lessonId, course]);

  // -------- quiz setup on slide change --------
  useEffect(() => {
    setSelectedAnswers({});
    setQuizFeedback("");
    setShowExplanation(false);
    setIsQuizCompleted(false);

    const q = activeSlide?.quiz;
    if (!q) {
      setShuffledAnswers([]);
      setShuffledPrompts([]);
      setIsQuizModalOpen(false);
      return;
    }

    if (q.type === "single-choice" || q.type === "multiple-choice") {
      setShuffledAnswers([...(q.answers || [])].sort(() => Math.random() - 0.5));
    } else if (q.type === "matching") {
      setShuffledPrompts([...(q.prompts || [])].sort(() => Math.random() - 0.5));
    } else {
      setShuffledAnswers([]);
      setShuffledPrompts([]);
    }
  }, [activeSlide]);

  // -------- keyboard navigation --------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // -------- swipe navigation --------
  const touchStartX = useRef(null);
  const onTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 40;
    if (dx < -threshold) handleNext();
    if (dx > threshold) handlePrev();
    touchStartX.current = null;
  };

  // -------- derived booleans --------
  const hasSlides = Boolean(activeLesson?.slides?.length);
  const isFirstSlide = activeLessonIndex === 0 && activeSlideIndex === 0;
  const isLastSlide =
    hasSlides &&
    activeSlideIndex === activeLesson.slides.length - 1 &&
    activeLessonIndex === (course?.lessons?.length || 1) - 1;

  const blockAdvanceForQuiz = isQuizModalOpen && activeSlide?.quiz && !isQuizCompleted;
  const blockAdvanceForFinal =
    isFinalExamLesson && !(isFinalExamPassed || hasPassedFinalExamBefore);

  const isNextDisabled = !activeLesson
    ? true
    : blockAdvanceForQuiz || blockAdvanceForFinal || isLastSlide;

  // -------- navigation helpers --------
  const handleSlideSelect = useCallback(
    (lessonIdx, slideIdx) => {
      if (!course) return;
      setActiveLessonIndex(lessonIdx);
      setActiveSlideIndex(slideIdx);
      navigate(`/lesson/${courseId}/${course.lessons[lessonIdx]._id}?slide=${slideIdx}`, {
        replace: true,
      });
      setIsQuizModalOpen(false);
    },
    [navigate, courseId, course]
  );

  const handleNext = useCallback(() => {
    if (!activeLesson || isNextDisabled) return;
    // within lesson
    if (activeSlideIndex < (activeLesson.slides?.length || 1) - 1) {
      handleSlideSelect(activeLessonIndex, activeSlideIndex + 1);
      return;
    }
    // next lesson
    if (activeLessonIndex < (course?.lessons?.length || 1) - 1) {
      handleSlideSelect(activeLessonIndex + 1, 0);
    }
  }, [
    activeLesson,
    isNextDisabled,
    activeSlideIndex,
    activeLessonIndex,
    course,
    handleSlideSelect,
  ]);

  const handlePrev = useCallback(() => {
    if (!activeLesson) return;
    if (activeSlideIndex > 0) {
      handleSlideSelect(activeLessonIndex, activeSlideIndex - 1);
      return;
    }
    if (activeLessonIndex > 0) {
      const prev = course.lessons[activeLessonIndex - 1];
      handleSlideSelect(activeLessonIndex - 1, Math.max(0, (prev.slides?.length || 1) - 1));
    }
  }, [activeLesson, activeSlideIndex, activeLessonIndex, course, handleSlideSelect]);

  const toggleLessonAccordion = (lessonIdx) =>
    setOpenLessons((p) => ({ ...p, [lessonIdx]: !p[lessonIdx] }));

  // -------- quiz handlers --------
  const handleSingleChoiceSelect = (answerId) => {
    if (!isQuizCompleted) setSelectedAnswers({ id: answerId });
  };
  const handleMultiChoiceSelect = (answerId) => {
    if (!isQuizCompleted) {
      setSelectedAnswers((prev) => ({ ...prev, [answerId]: !prev[answerId] }));
    }
  };
  const handleMatchingSelect = (promptId, answer) => {
    if (!isQuizCompleted) {
      setSelectedAnswers((prev) => ({ ...prev, [promptId]: answer }));
    }
  };

  const evaluateQuiz = (quiz) => {
    if (!quiz) return false;
    switch (quiz.type) {
      case "single-choice": {
        const correct = quiz.answers?.find((a) => a.isCorrect)?._id;
        return selectedAnswers.id === correct;
      }
      case "multiple-choice": {
        const correctIds = new Set((quiz.answers || []).filter((a) => a.isCorrect).map((a) => a._id));
        const chosen = new Set(
          Object.keys(selectedAnswers).filter((k) => selectedAnswers[k])
        );
        if (correctIds.size !== chosen.size) return false;
        for (const id of correctIds) if (!chosen.has(id)) return false;
        return true;
      }
      case "matching": {
        return (quiz.prompts || []).every(
          (p) => selectedAnswers[p._id] === p.correctAnswer
        );
      }
      default:
        return false;
    }
  };

  const handleQuizSubmit = async () => {
    if (!activeSlide?.quiz) return;
    const correct = evaluateQuiz(activeSlide.quiz);
    setQuizFeedback(correct ? "Correct! Well done." : "Incorrect. Please review the material.");
    setIsQuizCompleted(true);
    setShowExplanation(!correct);

    if (correct) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `/api/courses/${courseId}/complete-slide`,
          { lessonId: activeLesson._id, slideId: activeSlide._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        // no-op (don’t block UX)
        console.error("Failed to record slide completion:", err);
      }
    }
  };

  const handleFinalExamSubmit = async () => {
    if (!activeSlide?.quiz) return;
    const isPassed = evaluateQuiz(activeSlide.quiz);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `/api/courses/${courseId}/complete-final-exam`,
        {
          lessonId: activeLesson._id,
          isPassed,
          userAnswers: selectedAnswers,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQuizFeedback(
        isPassed
          ? "Congratulations! You passed the final exam!"
          : "You did not pass the final exam. Please review the material and try again."
      );
      setIsQuizCompleted(true);

      if (isPassed) {
        setIsFinalExamPassed(true);
        setShowCertificateModal(true);
      }
    } catch (err) {
      console.error("Final exam submission failed:", err);
      setQuizFeedback("An error occurred during submission. Please try again.");
      setIsQuizCompleted(true);
    }
  };

  const handleCloseQuizModal = () => {
    setIsQuizModalOpen(false);
    setQuizFeedback("");
    setShowExplanation(false);
    setIsQuizCompleted(false);
    setSelectedAnswers({});
  };

  // -------- certificate --------
  const closeCertificateModal = () => setShowCertificateModal(false);

  const generateAndSaveCertificate = async () => {
    if (!certificateRef.current || !course || !user) return;
    const canvas = await html2canvas(certificateRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });
    canvas.toBlob((blob) => {
      const safeTitle = course.title?.replace(/\s+/g, "-") || "course";
      const idPart = user?.idNumber || user?._id || "user";
      saveAs(blob, `certificate-${safeTitle}-${idPart}.png`);
    });
  };

  // -------- video renderer --------
  const getVideoElement = (element) => {
    const c = element?.content || "";
    const yt = parseYouTubeId(c);
    if (yt) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
          className="w-full h-full object-cover"
        />
      );
    }
    if (c.includes("vimeo.com")) {
      const id = (() => {
        try {
          const u = new URL(c);
          return u.pathname.split("/").pop();
        } catch {
          return c.split("/").pop();
        }
      })();
      return (
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          frameBorder="0"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video player"
          className="w-full h-full object-cover"
        />
      );
    }
    return <video src={c} controls className="w-full h-full object-cover" />;
  };

  // -------- fullscreen --------
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // -------- ui --------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-slate-200">
        <Loader2 className="h-7 w-7 animate-spin mr-2" />
        Loading Lesson...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <div className="rounded-xl border border-red-800 bg-red-900/40 px-6 py-4 text-red-100">
          {error}
        </div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">
        Course data not found.
      </div>
    );
  }
  if (!activeLesson) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">
        This course has no lessons.
      </div>
    );
  }

  const progressPct = hasSlides
    ? Math.round(((activeSlideIndex + 1) / activeLesson.slides.length) * 100)
    : 0;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen">
      {/* header */}
      <div className="sticky top-0 z-30 border-b border-slate-200/40 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="Back"
          >
            <ArrowLeftIcon className="inline-block mr-1 h-5 w-5" />
            Back
          </button>
          <div className="min-w-0">
            <p className="text-blue-600 dark:text-blue-400 font-semibold truncate">{course.title}</p>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              {activeLesson.title}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300">
              Slide {hasSlides ? activeSlideIndex + 1 : 0}/{activeLesson.slides?.length || 0}
            </span>
            <button
              onClick={toggleFullscreen}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* body */}
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* stage */}
          <div className="w-full lg:flex-grow order-1 lg:order-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="p-2 md:p-4">
                {activeSlide ? (
                  <>
                    <div
                      ref={stageRef}
                      className="relative w-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner select-none"
                      style={{ backgroundColor: activeSlide?.backgroundColor || undefined }}
                      onTouchStart={onTouchStart}
                      onTouchEnd={onTouchEnd}
                    >
                      {(activeSlide?.elements || []).map((el, idx) => {
                        const isText = el.type === "text";
                        const style = {
                          position: "absolute",
                          left: `${((el.position?.x || 0) / 960) * 100}%`,
                          top: `${((el.position?.y || 0) / 540) * 100}%`,
                          width: `${((el.size?.width || 0) / 960) * 100}%`,
                          height: isText ? "auto" : `${((el.size?.height || 0) / 540) * 100}%`,
                          zIndex: el.zIndex || 1,
                          transform: `rotate(${el.rotation || 0}deg)`,
                        };
                        const textStyles = isText
                          ? {
                              color: el.color || "inherit",
                              fontWeight: el.isBold ? "bold" : "normal",
                              fontStyle: el.isItalic ? "italic" : "normal",
                              width: "100%",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }
                          : {};

                        return (
                          <div key={idx} style={style}>
                            {el.type === "text" && (
                              <div
                                dangerouslySetInnerHTML={{ __html: el.content || "" }}
                                style={textStyles}
                                className="text-xs md:text-sm lg:text-base"
                              />
                            )}
                            {el.type === "image" && (
                              <img
                                src={el.content}
                                alt=""
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            )}
                            {el.type === "video" && getVideoElement(el)}
                          </div>
                        );
                      })}
                    </div>

                    {/* quiz entry */}
                    {activeSlide?.quiz && !isQuizModalOpen && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setIsQuizModalOpen(true)}
                          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg"
                        >
                          Start Quiz
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg">
                    <p className="text-gray-500">This slide is empty.</p>
                  </div>
                )}
              </div>

              {/* bottom controls */}
              <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handlePrev}
                  disabled={isFirstSlide}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
                >
                  <ArrowLeftIcon className="h-5 w-5" /> Previous
                </button>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  Slide {activeSlideIndex + 1} / {activeLesson?.slides?.length || 0}
                </span>
                <button
                  onClick={handleNext}
                  disabled={isNextDisabled}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-sm flex items-center gap-2"
                  title={
                    blockAdvanceForQuiz
                      ? "Finish the quiz first"
                      : blockAdvanceForFinal
                      ? "Pass the final exam to continue"
                      : undefined
                  }
                >
                  Next <ArrowRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="w-full lg:w-96 flex-shrink-0 order-2 lg:order-2">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-24 max-h-[75vh] overflow-y-auto">
              <h3 className="font-bold mb-4 text-gray-900 dark:text-white text-xl">Course Content</h3>
              <div className="space-y-2 pr-1">
                {(course.lessons || []).map((lesson, lessonIdx) => (
                  <div
                    key={lesson._id}
                    className="border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                  >
                    <button
                      onClick={() => toggleLessonAccordion(lessonIdx)}
                      className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                    >
                      <span className="truncate">{lesson.title}</span>
                      <ChevronDownIcon
                        className={`w-5 h-5 transition-transform ${
                          openLessons[lessonIdx] ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openLessons[lessonIdx] && (
                      <div className="pl-4 pb-2">
                        {(lesson.slides || []).map((slide, slideIdx) => {
                          const isActive =
                            activeLessonIndex === lessonIdx && activeSlideIndex === slideIdx;
                          const label =
                            slide.title ||
                            (slide.quiz
                              ? `Quiz: ${String(slide.quiz.question || "")
                                  .slice(0, 24)
                                  .trim()}…`
                              : `Slide ${slideIdx + 1}`);
                          return (
                            <div
                              key={slide._id || `${lessonIdx}-${slideIdx}`}
                              onClick={() => handleSlideSelect(lessonIdx, slideIdx)}
                              className={`block p-2 rounded-md cursor-pointer transition-colors ${
                                isActive
                                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                              }`}
                              title={label}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* quiz modal */}
      {isQuizModalOpen && activeSlide?.quiz && (
        <div className="fixed inset-0 bg-gray-900/80 z-[90] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 md:p-8 relative">
            <button
              onClick={handleCloseQuizModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
              aria-label="Close quiz"
            >
              <XCircleIcon size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
              {activeSlide.quiz.question}
            </h2>

            {isFinalExamLesson && (isFinalExamPassed || hasPassedFinalExamBefore) ? (
              <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                <p className="font-semibold">
                  You have passed the final exam! You can download your certificate from your
                  dashboard.
                </p>
              </div>
            ) : (
              <>
                {(activeSlide.quiz.type === "single-choice" ||
                  activeSlide.quiz.type === "multiple-choice") && (
                  <div className="space-y-3">
                    {shuffledAnswers.map((answer) => {
                      const checked =
                        selectedAnswers[answer._id] || selectedAnswers.id === answer._id;
                      return (
                        <div
                          key={answer._id}
                          onClick={() =>
                            !isQuizCompleted &&
                            (activeSlide.quiz.type === "single-choice"
                              ? handleSingleChoiceSelect(answer._id)
                              : handleMultiChoiceSelect(answer._id))
                          }
                          className={`p-4 rounded-lg text-left transition flex items-center gap-4 cursor-pointer border-2 ${
                            checked
                              ? "bg-blue-100 dark:bg-blue-900/40 border-blue-500"
                              : "bg-white dark:bg-slate-700/40 border-transparent hover:border-blue-400"
                          }`}
                        >
                          <input
                            type={activeSlide.quiz.type === "single-choice" ? "radio" : "checkbox"}
                            readOnly
                            checked={checked || false}
                            className="h-5 w-5 pointer-events-none"
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {answer.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeSlide.quiz.type === "matching" && (
                  <div className="space-y-4 w-full max-w-3xl mx-auto">
                    {shuffledPrompts.map((prompt) => (
                      <div
                        key={prompt._id}
                        className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 gap-3"
                      >
                        <label className="mr-4 font-semibold text-slate-700 dark:text-slate-300">
                          {prompt.prompt}
                        </label>
                        <select
                          onChange={(e) => handleMatchingSelect(prompt._id, e.target.value)}
                          value={selectedAnswers[prompt._id] || ""}
                          disabled={isQuizCompleted}
                          className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 w-48"
                        >
                          <option value="" disabled>
                            --Select--
                          </option>
                          {(activeSlide.quiz.matchOptions || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {quizFeedback && (
                  <div
                    className={`mt-6 p-3 rounded-lg text-white font-semibold flex items-center gap-2 max-w-lg mx-auto ${
                      isQuizCompleted ? (quizFeedback.startsWith("Congrat") ? "bg-green-500" : "bg-red-500") : "bg-blue-600"
                    }`}
                  >
                    {quizFeedback.startsWith("Correct") || quizFeedback.startsWith("Congrat") ? (
                      <CheckCircleIcon />
                    ) : (
                      <XCircleIcon />
                    )}
                    <span>{quizFeedback}</span>
                  </div>
                )}

                {showExplanation && activeSlide.quiz.explanation && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 max-w-lg mx-auto">
                    <b className="block mb-1">Explanation:</b>
                    {activeSlide.quiz.explanation}
                  </div>
                )}

                <div className="mt-6 text-center">
                  {isFinalExamLesson ? (
                    <button
                      onClick={handleFinalExamSubmit}
                      disabled={isFinalExamPassed || hasPassedFinalExamBefore || isQuizCompleted}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-lg"
                    >
                      Submit Final Exam
                    </button>
                  ) : (
                    <button
                      onClick={handleQuizSubmit}
                      disabled={isQuizCompleted}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-lg"
                    >
                      Submit Answer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* certificate modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center p-4 z-[99]">
          <div className="relative w-full max-w-5xl h-3/4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-10 text-center flex flex-col items-center justify-center overflow-auto">
            <button
              onClick={closeCertificateModal}
              className="absolute top-4 right-4 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
              aria-label="Close certificate"
            >
              <XCircleIcon size={28} />
            </button>

            <div
              ref={certificateRef}
              className="w-full h-full p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 border-8 border-blue-600 dark:border-blue-400 rounded-md"
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                Certificate of Completion
              </h1>
              <p className="text-xl md:text-2xl mt-2 text-gray-700 dark:text-gray-300">
                This is to certify that
              </p>
              <h2 className="text-4xl md:text-5xl font-bold my-4 md:my-8 text-black dark:text-white">
                {user?.name}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">
                ID: {user?.idNumber}
              </p>
              <p className="text-xl md:text-2xl mt-8 text-gray-700 dark:text-gray-300">
                has successfully completed the course
              </p>
              <h3 className="text-3xl md:text-4xl font-semibold my-4 text-gray-800 dark:text-gray-200">
                {course?.title}
              </h3>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">
                on {new Date().toLocaleDateString()}
              </p>
              <div className="mt-8 md:mt-12 text-lg md:text-2xl text-gray-700 dark:text-gray-300">
                <p>_______________________</p>
                <p className="mt-2">POCUS World Instructor</p>
                <p className="text-base md:text-lg">{course?.creator?.fullName}</p>
              </div>
            </div>

            <button
              onClick={generateAndSaveCertificate}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              <Download size={20} /> Download & Save Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonView;
