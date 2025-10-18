
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import {
  ChevronDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  Download,
} from "lucide-react";

// -----------------------------------------------------------------------------
// constants / helpers
// -----------------------------------------------------------------------------
const BASE = { W: 960, H: 540 };
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function normalizeQuiz(q) {
  if (!q) return null;
  const out = { ...q };

  // Normalize answers
  if (Array.isArray(out.answers)) {
    out.answers = out.answers.map((a) => ({
      _id: a?._id || genId(),
      text: a?.text ?? "",
      isCorrect: !!a?.isCorrect,
    }));
  }

  // Accept both shapes for matching
  if (Array.isArray(out.prompts)) {
    out.prompts = out.prompts.map((p) => ({
      _id: p?._id || genId(),
      prompt: p?.prompt ?? "",
      correctAnswer: p?.correctAnswer ?? "",
    }));
  } else if (Array.isArray(out.matchPrompts)) {
    out.prompts = out.matchPrompts.map((p) => ({
      _id: p?._id || genId(),
      prompt: p?.prompt ?? "",
      correctAnswer: p?.correctMatch ?? "",
    }));
  } else {
    out.prompts = [];
  }

  if (!Array.isArray(out.matchOptions)) out.matchOptions = [];
  if (typeof out.question !== "string") out.question = "";
  if (typeof out.explanation !== "string") out.explanation = "";

  return out;
}

function normalizeCourse(course) {
  const c = JSON.parse(JSON.stringify(course || {}));
  c.title = c.title ?? "Untitled";
  c.lessons = Array.isArray(c.lessons) ? c.lessons : [];
  c.lessons.forEach((lesson) => {
    lesson.slides = Array.isArray(lesson.slides) ? lesson.slides : [];
    lesson.slides.forEach((slide) => {
      slide.elements = Array.isArray(slide.elements) ? slide.elements : [];
      if (slide.quiz) slide.quiz = normalizeQuiz(slide.quiz);
      if (typeof slide.backgroundColor !== "string") slide.backgroundColor = "#FFFFFF";
      slide.title = slide.title ?? "";
    });
  });
  return c;
}

function clampIndex(i, len) {
  if (len <= 0) return 0;
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

function parseYouTubeId(url = "") {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const parts = u.pathname.split("/");
      const idx = parts.findIndex((p) => p === "embed");
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {}
  return null;
}

const LessonView = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [course, setCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [openLessons, setOpenLessons] = useState({});

  // quiz state
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isFinalExamPassed, setIsFinalExamPassed] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [shuffledPrompts, setShuffledPrompts] = useState([]);

  const certificateRef = useRef(null);

  // ---------------------------------------------------------------------------
  // fetch / hydrate
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const courseRes = await axios.get(`/api/courses/${courseId}`, config);
        const normalized = normalizeCourse(courseRes.data);
        setCourse(normalized);

        try {
          const userRes = await axios.get("/api/users/profile", config);
          setUser(userRes.data);
        } catch {
          setUser(null);
        }

        // initial indices from route/params
        let lessonIdx = 0;
        if (lessonId) {
          const found = normalized.lessons.findIndex((l) => l._id === lessonId);
          if (found !== -1) lessonIdx = found;
        }
        let slideIdx = parseInt(searchParams.get("slide") || "0", 10);
        slideIdx = isNaN(slideIdx) ? 0 : slideIdx;

        lessonIdx = clampIndex(lessonIdx, normalized.lessons.length);
        slideIdx = clampIndex(slideIdx, normalized.lessons[lessonIdx]?.slides?.length || 0);

        setActiveLessonIndex(lessonIdx);
        setActiveSlideIndex(slideIdx);
        setOpenLessons((prev) => ({ ...prev, [lessonIdx]: true }));
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load course or lesson. Please check your enrollment status and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, lessonId, searchParams]);

  // keep indices valid if course changes
  useEffect(() => {
    if (!course) return;
    const lidx = clampIndex(activeLessonIndex, course.lessons.length);
    const sidx = clampIndex(activeSlideIndex, course.lessons[lidx]?.slides?.length || 0);
    if (lidx !== activeLessonIndex) setActiveLessonIndex(lidx);
    if (sidx !== activeSlideIndex) setActiveSlideIndex(sidx);
  }, [course, activeLessonIndex, activeSlideIndex]);

  const activeLesson = course?.lessons?.[activeLessonIndex];
  const activeSlide = activeLesson?.slides?.[activeSlideIndex] || null;
  const isFinalExamLesson = !!activeLesson?.isFinalExam;

  // already passed on server?
  const hasPassedFinalExamBefore = !!user?.completedCourses?.some(
    (c) => String(c.courseId) === String(courseId) && c.passedFinalExam
  );

  // ---------------------------------------------------------------------------
  // quiz shuffle + reset when slide changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeSlide?.quiz) {
      setShuffledAnswers([]);
      setShuffledPrompts([]);
      setSelectedAnswers({});
      setQuizFeedback("");
      setShowExplanation(false);
      setIsQuizCompleted(false);
      return;
    }

    const quiz = normalizeQuiz(activeSlide.quiz);
    if (quiz.type === "single-choice" || quiz.type === "multiple-choice") {
      setShuffledAnswers([...(quiz.answers || [])].sort(() => Math.random() - 0.5));
    } else if (quiz.type === "matching") {
      setShuffledPrompts([...(quiz.prompts || [])].sort(() => Math.random() - 0.5));
    }
    setSelectedAnswers({});
    setQuizFeedback("");
    setShowExplanation(false);
    setIsQuizCompleted(false);
  }, [activeSlide?.quiz, activeSlideIndex, activeLessonIndex]);

  // ---------------------------------------------------------------------------
  // nav
  // ---------------------------------------------------------------------------
  const handleSlideSelect = useCallback(
    (lessonIdx, slideIdx) => {
      if (!course) return;
      const li = clampIndex(lessonIdx, course.lessons.length);
      const si = clampIndex(slideIdx, course.lessons[li]?.slides?.length || 0);
      setActiveLessonIndex(li);
      setActiveSlideIndex(si);
      setIsQuizModalOpen(false);

      const lesson = course.lessons[li];
      navigate(`/lesson/${courseId}/${lesson._id}?slide=${si}`, { replace: true });
    },
    [course, courseId, navigate]
  );

  const toggleLessonAccordion = useCallback((lessonIdx) => {
    setOpenLessons((prev) => ({ ...prev, [lessonIdx]: !prev[lessonIdx] }));
  }, []);

  const goToNextSlide = useCallback(() => {
    if (!course || !activeLesson) return;
    const slidesCount = activeLesson.slides?.length || 0;

    // ✅ No gating: freely advance within the lesson
    if (activeSlideIndex < slidesCount - 1) {
      handleSlideSelect(activeLessonIndex, activeSlideIndex + 1);
      return;
    }

    // ...or to the next lesson’s first slide
    const hasMoreLessons = activeLessonIndex < (course.lessons?.length || 0) - 1;
    if (hasMoreLessons) {
      handleSlideSelect(activeLessonIndex + 1, 0);
    }
  }, [course, activeLesson, activeSlideIndex, activeLessonIndex, handleSlideSelect]);

  const goToPreviousSlide = useCallback(() => {
    if (!course || !activeLesson) return;
    if (activeSlideIndex > 0) {
      handleSlideSelect(activeLessonIndex, activeSlideIndex - 1);
    } else if (activeLessonIndex > 0) {
      const prevLesson = course.lessons[activeLessonIndex - 1];
      handleSlideSelect(activeLessonIndex - 1, (prevLesson?.slides?.length || 1) - 1);
    }
  }, [course, activeLesson, activeSlideIndex, activeLessonIndex, handleSlideSelect]);

  const isNextDisabled = useMemo(() => {
    if (!course || !activeLesson) return true;
    if (activeSlideIndex < (activeLesson.slides?.length || 0) - 1) return false;
    if (activeLessonIndex < (course.lessons?.length || 0) - 1) return false;
    return true;
  }, [course, activeLesson, activeSlideIndex, activeLessonIndex]);

  // ---------------------------------------------------------------------------
  // quiz interactions
  // ---------------------------------------------------------------------------
  const handleSingleChoiceSelect = useCallback(
    (answerId) => {
      if (!isQuizCompleted) setSelectedAnswers({ id: answerId });
    },
    [isQuizCompleted]
  );

  const handleMultiChoiceSelect = useCallback(
    (answerId) => {
      if (!isQuizCompleted) {
        setSelectedAnswers((prev) => ({ ...prev, [answerId]: !prev[answerId] }));
      }
    },
    [isQuizCompleted]
  );

  const handleMatchingSelect = useCallback(
    (promptId, answer) => {
      if (!isQuizCompleted) {
        setSelectedAnswers((prev) => ({ ...prev, [promptId]: answer }));
      }
    },
    [isQuizCompleted]
  );

  const handleQuizSubmit = useCallback(async () => {
    if (!activeSlide?.quiz) return;
    const quiz = normalizeQuiz(activeSlide.quiz);

    const isCorrect = (() => {
      switch (quiz.type) {
        case "single-choice": {
          const correctId = (quiz.answers || []).find((a) => a.isCorrect)?._id;
          return selectedAnswers.id === correctId;
        }
        case "multiple-choice": {
          const correctIds = new Set((quiz.answers || []).filter((a) => a.isCorrect).map((a) => a._id));
          const selectedIds = new Set(Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]));
          if (correctIds.size !== selectedIds.size) return false;
          for (const id of correctIds) if (!selectedIds.has(id)) return false;
          return true;
        }
        case "matching": {
          return (quiz.prompts || []).every((p) => selectedAnswers[p._id] === p.correctAnswer);
        }
        default:
          return false;
      }
    })();

    setQuizFeedback(isCorrect ? "Correct! Well done." : "Incorrect. Please review the material.");
    setIsQuizCompleted(true);
    setShowExplanation(!isCorrect);

    if (isCorrect) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        await axios.post(
          `/api/courses/${courseId}/complete-slide`,
          { lessonId: activeLesson._id, slideId: activeSlide._id },
          { headers }
        );
      } catch (err) {
        console.error("Failed to record slide completion:", err);
      }
    }
  }, [activeSlide, selectedAnswers, activeLesson, courseId]);

  const handleFinalExamSubmit = useCallback(async () => {
    if (!activeSlide?.quiz) return;
    const quiz = normalizeQuiz(activeSlide.quiz);
    const isExamCorrect = (quiz.prompts || []).every((p) => selectedAnswers[p._id] === p.correctAnswer);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: { Authorization: `Bearer ${token}` } } : undefined;
      await axios.post(
        `/api/courses/${courseId}/complete-final-exam`,
        {
          lessonId: activeLesson._id,
          isPassed: isExamCorrect,
          userAnswers: selectedAnswers,
        },
        { headers }
      );

      if (isExamCorrect) {
        setIsFinalExamPassed(true);
        setShowCertificateModal(true);
        setQuizFeedback("Congratulations! You passed the final exam!");
        setIsQuizCompleted(true);
      } else {
        setQuizFeedback("You did not pass the final exam. Please review the course material and try again.");
        setIsQuizCompleted(true);
      }
    } catch (err) {
      console.error("Final exam submission failed:", err);
      setQuizFeedback("An error occurred during submission. Please try again.");
    }
  }, [activeSlide, selectedAnswers, activeLesson, courseId]);

  const handleCloseQuizModal = () => {
    setIsQuizModalOpen(false);
    setQuizFeedback("");
    setShowExplanation(false);
    setIsQuizCompleted(false);
    setSelectedAnswers({});
  };

  // ---------------------------------------------------------------------------
  // rendering helpers
  // ---------------------------------------------------------------------------
  const renderElement = (element, index) => {
    const isText = element.type === "text";

    const style = {
      position: "absolute",
      left: `${((element.position?.x || 0) / BASE.W) * 100}%`,
      top: `${((element.position?.y || 0) / BASE.H) * 100}%`,
      width: `${((element.size?.width || 0) / BASE.W) * 100}%`,
      height: isText ? "auto" : `${((element.size?.height || 0) / BASE.H) * 100}%`,
      zIndex: element.zIndex || 1,
      transform: `rotate(${element.rotation || 0}deg)`,
      overflow: "hidden",
    };

    if (element.type === "text") {
      const textStyles = {
        fontSize: `${element.fontSize || 16}px`,
        color: element.color || "#000",
        fontWeight: element.isBold ? "bold" : "normal",
        fontStyle: element.isItalic ? "italic" : "normal",
        width: "100%",
        height: "100%",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      };
      return (
        <div key={index} style={style}>
          <div
            dangerouslySetInnerHTML={{ __html: element.content || "" }}
            style={textStyles}
            className="text-xs md:text-sm lg:text-base"
          />
        </div>
      );
    }

    if (element.type === "image") {
      return (
        <div key={index} style={style}>
          {element.content ? (
            <img src={element.content} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
      );
    }

    if (element.type === "video") {
      const url = element.content || "";
      const yt = parseYouTubeId(url);
      const isVimeo = /vimeo\.com/.test(url);
      return (
        <div key={index} style={style}>
          {yt ? (
            <iframe
              src={`https://www.youtube.com/embed/${yt}`}
              title="YouTube"
              className="w-full h-full object-cover"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isVimeo ? (
            <iframe
              src={`https://player.vimeo.com/video/${url.split("/").pop()}`}
              title="Vimeo"
              className="w-full h-full object-cover"
              frameBorder="0"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : url ? (
            <video src={url} controls className="w-full h-full object-cover" />
          ) : null}
        </div>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // UI states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">
        Loading Lesson...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-red-500">
        {error}
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

  const hasQuiz = !!activeSlide?.quiz;

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* main panel */}
          <div className="w-full lg:flex-grow order-1 lg:order-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="p-6 lg:p-8">
                <p className="text-blue-600 dark:text-blue-400 font-semibold">{course.title}</p>
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mt-1">
                  {activeLesson.title}
                </h1>
              </div>

              <div className="p-2 md:p-4">
                {activeSlide ? (
                  <>
                    <div className="w-full">
                      <div
                        className="relative w-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden shadow-inner"
                        style={{ backgroundColor: activeSlide?.backgroundColor || "#FFFFFF" }}
                      >
                        {(activeSlide.elements || []).map((el, i) => renderElement(el, i))}
                      </div>

                      {hasQuiz && !isQuizModalOpen && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setIsQuizModalOpen(true)}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg"
                          >
                            Start Quiz
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quiz Modal */}
                    {isQuizModalOpen && hasQuiz && (
                      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-[90] flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 relative">
                          <button
                            onClick={() => {
                              setIsQuizModalOpen(false);
                              setQuizFeedback("");
                              setShowExplanation(false);
                              setIsQuizCompleted(false);
                              setSelectedAnswers({});
                            }}
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
                          >
                            <XCircleIcon size={24} />
                          </button>

                          <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                            {activeSlide.quiz?.question || "Quiz"}
                          </h2>

                          {hasPassedFinalExamBefore && isFinalExamLesson ? (
                            <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                              <p className="font-semibold">
                                You have already passed the final exam! You can download your certificate from your
                                dashboard.
                              </p>
                            </div>
                          ) : (
                            <>
                              {["single-choice", "multiple-choice"].includes(activeSlide.quiz?.type) && (
                                <div className="space-y-3">
                                  {(shuffledAnswers || []).map((answer) => {
                                    const checked =
                                      activeSlide.quiz.type === "single-choice"
                                        ? selectedAnswers.id === answer._id
                                        : !!selectedAnswers[answer._id];
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
                                            ? "bg-blue-100 dark:bg-blue-900/50 border-blue-500"
                                            : "bg-white dark:bg-slate-700/50 border-transparent hover:border-blue-400"
                                        }`}
                                      >
                                        <input
                                          type={activeSlide.quiz.type === "single-choice" ? "radio" : "checkbox"}
                                          readOnly
                                          checked={checked}
                                          className="h-5 w-5 pointer-events-none text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                          {answer.text}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {activeSlide.quiz?.type === "matching" && (
                                <div className="space-y-4 w-full max-w-3xl mx-auto">
                                  {(shuffledPrompts || []).map((prompt) => (
                                    <div
                                      key={prompt._id}
                                      className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3"
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
                                        {(activeSlide.quiz?.matchOptions || []).map((opt) => (
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
                                    isQuizCompleted
                                      ? isFinalExamPassed
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                      : "bg-slate-500"
                                  }`}
                                >
                                  {isQuizCompleted ? (
                                    isFinalExamPassed ? (
                                      <CheckCircleIcon />
                                    ) : (
                                      <XCircleIcon />
                                    )
                                  ) : null}
                                  <span>{quizFeedback}</span>
                                </div>
                              )}

                              {showExplanation && activeSlide.quiz?.explanation && (
                                <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                                  <b className="block mb-1">Explanation:</b>
                                  {activeSlide.quiz.explanation}
                                </div>
                              )}

                              <div className="mt-6 flex items-center justify-center gap-3">
                                {/* Allow skipping quiz without blocking navigation */}
                                <button
                                  onClick={() => {
                                    setIsQuizModalOpen(false);
                                    setIsQuizCompleted(false);
                                    setShowExplanation(false);
                                    setQuizFeedback("");
                                  }}
                                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                                >
                                  Skip quiz
                                </button>

                                {isFinalExamLesson ? (
                                  <button
                                    onClick={async () => {
                                      // submit final exam
                                      if (!activeSlide?.quiz) return;
                                      const quiz = normalizeQuiz(activeSlide.quiz);
                                      const isExamCorrect = (quiz.prompts || []).every(
                                        (p) => selectedAnswers[p._id] === p.correctAnswer
                                      );
                                      try {
                                        const token = localStorage.getItem("token");
                                        const headers = token
                                          ? { Authorization: `Bearer ${token}` }
                                          : undefined;
                                        await axios.post(
                                          `/api/courses/${courseId}/complete-final-exam`,
                                          {
                                            lessonId: activeLesson._id,
                                            isPassed: isExamCorrect,
                                            userAnswers: selectedAnswers,
                                          },
                                          { headers }
                                        );
                                        if (isExamCorrect) {
                                          setIsFinalExamPassed(true);
                                          setShowCertificateModal(true);
                                          setQuizFeedback("Congratulations! You passed the final exam!");
                                          setIsQuizCompleted(true);
                                        } else {
                                          setQuizFeedback(
                                            "You did not pass the final exam. Please review the course material and try again."
                                          );
                                          setIsQuizCompleted(true);
                                        }
                                      } catch (err) {
                                        console.error("Final exam submission failed:", err);
                                        setQuizFeedback("An error occurred during submission. Please try again.");
                                      }
                                    }}
                                    disabled={hasPassedFinalExamBefore || isQuizCompleted}
                                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-lg"
                                  >
                                    Submit Final Exam
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      // submit quiz
                                      if (!activeSlide?.quiz) return;
                                      const quiz = normalizeQuiz(activeSlide.quiz);
                                      const isCorrect = (() => {
                                        switch (quiz.type) {
                                          case "single-choice": {
                                            const correctId = (quiz.answers || []).find((a) => a.isCorrect)?._id;
                                            return selectedAnswers.id === correctId;
                                          }
                                          case "multiple-choice": {
                                            const correctIds = new Set(
                                              (quiz.answers || []).filter((a) => a.isCorrect).map((a) => a._id)
                                            );
                                            const selectedIds = new Set(
                                              Object.keys(selectedAnswers).filter((k) => selectedAnswers[k])
                                            );
                                            if (correctIds.size !== selectedIds.size) return false;
                                            for (const id of correctIds) if (!selectedIds.has(id)) return false;
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
                                      })();
                                      setQuizFeedback(isCorrect ? "Correct! Well done." : "Incorrect. Please review the material.");
                                      setIsQuizCompleted(true);
                                      setShowExplanation(!isCorrect);
                                      if (isCorrect) {
                                        try {
                                          const token = localStorage.getItem("token");
                                          const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
                                          await axios.post(
                                            `/api/courses/${courseId}/complete-slide`,
                                            { lessonId: activeLesson._id, slideId: activeSlide._id },
                                            { headers }
                                          );
                                        } catch (err) {
                                          console.error("Failed to record slide completion:", err);
                                        }
                                      }
                                    }}
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg">
                    <p className="text-gray-500">This slide is empty.</p>
                  </div>
                )}
              </div>

              {/* footer nav */}
              <div className="flex justify-between items-center mt-4 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={goToPreviousSlide}
                  disabled={activeLessonIndex === 0 && activeSlideIndex === 0}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
                >
                  <ArrowLeftIcon /> Previous
                </button>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  Slide {activeSlideIndex + 1} / {activeLesson?.slides?.length || 0}
                </span>
                <button
                  onClick={goToNextSlide}
                  disabled={isNextDisabled}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-sm flex items-center gap-2"
                >
                  Next <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="w-full lg:w-96 flex-shrink-0 order-2 lg:order-2">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-24">
              <h3 className="font-bold mb-4 text-gray-900 dark:text-white text-xl">Course Content</h3>
              <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2">
                {(course.lessons || []).map((lesson, lessonIdx) => (
                  <div key={lesson._id || lessonIdx} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                    <button
                      onClick={() => toggleLessonAccordion(lessonIdx)}
                      className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                    >
                      <span>{lesson.title || `Lesson ${lessonIdx + 1}`}</span>
                      <ChevronDownIcon
                        className={`w-5 h-5 transition-transform ${openLessons[lessonIdx] ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openLessons[lessonIdx] && (
                      <div className="pl-4 py-2">
                        {(lesson.slides || []).map((slide, slideIdx) => (
                          <div
                            key={slide._id || slideIdx}
                            onClick={() => handleSlideSelect(lessonIdx, slideIdx)}
                            className={`block p-2 rounded-md cursor-pointer transition-colors ${
                              activeLessonIndex === lessonIdx && activeSlideIndex === slideIdx
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {slide.title ||
                              (slide.quiz ? `Quiz: ${(slide.quiz.question || "").slice(0, 20)}...` : `Slide ${slideIdx + 1}`)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[999]">
          <div className="relative w-full max-w-5xl h-3/4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-12 text-center flex flex-col items-center justify-center overflow-auto">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
            >
              <XCircleIcon size={32} />
            </button>

            <div
              ref={certificateRef}
              className="w-full h-full p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 border-8 border-blue-600 dark:border-blue-400"
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                Certificate of Completion
              </h1>
              <p className="text-xl md:text-2xl mt-4 text-gray-700 dark:text-gray-300">This is to certify that</p>
              <h2 className="text-4xl md:text-5xl font-bold my-4 md:my-8 text-black dark:text-white">{user?.name}</h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">ID: {user?.idNumber}</p>
              <p className="text-xl md:text-2xl mt-8 text-gray-700 dark:text-gray-300">has successfully completed the course</p>
              <h3 className="text-3xl md:text-4xl font-semibold my-4 text-gray-800 dark:text-gray-200">{course?.title}</h3>
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
              onClick={async () => {
                if (!certificateRef.current) return;
                const canvas = await html2canvas(certificateRef.current, {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: "#ffffff",
                });
                canvas.toBlob((blob) => {
                  saveAs(blob, `certificate-${(course.title || "").replace(/\s+/g, "-")}-${user?.idNumber}.png`);
                });
              }}
              className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
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
