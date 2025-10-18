import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  XCircleIcon,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  Eye,
} from "lucide-react";

/* -------------------- CONSTANTS & HELPERS -------------------- */
const BASE = { W: 960, H: 540 };       // storage design base
const CANVAS = { W: 1280, H: 720 };    // editor/viewer canvas design
const SX = CANVAS.W / BASE.W;
const SY = CANVAS.H / BASE.H;

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const clamp = (i, len) => (len <= 0 ? 0 : Math.max(0, Math.min(i, len - 1)));

const positionKey = (courseId) => `courseProgress:${courseId}`;
const completedKey = (courseId) => `courseCompletedSlides:${courseId}`;
const certShownKey = (courseId) => `courseCertificateShown:${courseId}`;
const certSavedKey = (courseId) => `courseCertificateSaved:${courseId}`;

function savePosition(courseId, lessonId, slideIdx) {
  try { localStorage.setItem(positionKey(courseId), JSON.stringify({ lessonId, slideIdx })); } catch {}
}
function loadPosition(courseId) {
  try {
    const raw = localStorage.getItem(positionKey(courseId));
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (typeof j?.slideIdx !== "number" || !j?.lessonId) return null;
    return j;
  } catch { return null; }
}
function saveCompleted(courseId, set) {
  try { localStorage.setItem(completedKey(courseId), JSON.stringify([...set])); } catch {}
}
function loadCompleted(courseId) {
  try {
    const raw = localStorage.getItem(completedKey(courseId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}
function setCertShown(courseId) {
  try { localStorage.setItem(certShownKey(courseId), "1"); } catch {}
}
function getCertShown(courseId) {
  try { return localStorage.getItem(certShownKey(courseId)) === "1"; } catch { return false; }
}
function setCertSaved(courseId) {
  try { localStorage.setItem(certSavedKey(courseId), "1"); } catch {}
}
function getCertSaved(courseId) {
  try { return localStorage.getItem(certSavedKey(courseId)) === "1"; } catch { return false; }
}

function normalizeQuiz(q) {
  if (!q) return null;
  const out = { ...q };
  out.answers = Array.isArray(out.answers)
    ? out.answers.map((a) => ({ _id: a?._id || genId(), text: a?.text ?? "", isCorrect: !!a?.isCorrect }))
    : [];
  if (Array.isArray(out.prompts)) {
    out.prompts = out.prompts.map((p) => ({ _id: p?._id || genId(), prompt: p?.prompt ?? "", correctAnswer: p?.correctAnswer ?? "" }));
  } else if (Array.isArray(out.matchPrompts)) {
    out.prompts = out.matchPrompts.map((p) => ({ _id: p?._id || genId(), prompt: p?.prompt ?? "", correctAnswer: p?.correctMatch ?? "" }));
  } else out.prompts = [];
  out.matchOptions = Array.isArray(out.matchOptions) ? out.matchOptions : [];
  out.type = out.type || (out.answers.length ? "single-choice" : "matching");
  out.question = out.question || "Quiz";
  out.explanation = out.explanation || "";
  return out;
}
function normalizeCourse(raw) {
  const c = JSON.parse(JSON.stringify(raw || {}));
  c.title = c.title ?? "Untitled";
  c.lessons = Array.isArray(c.lessons) ? c.lessons : [];
  c.lessons.forEach((lesson) => {
    lesson.title = lesson.title ?? "Lesson";
    lesson.slides = Array.isArray(lesson.slides) ? lesson.slides : [];
    lesson.slides.forEach((s) => {
      s.title = s.title ?? "";
      s.backgroundColor = typeof s.backgroundColor === "string" ? s.backgroundColor : "#FFFFFF";
      s.elements = Array.isArray(s.elements) ? s.elements : [];
      if (s.quiz) s.quiz = normalizeQuiz(s.quiz);
    });
  });
  return c;
}
function buildFlatMap(course) {
  const flat = [];
  (course?.lessons || []).forEach((lesson, li) => {
    (lesson?.slides || []).forEach((_, si) => { flat.push({ lessonIdx: li, slideIdx: si }); });
  });
  return flat;
}
function slideKey(lesson, slide, li, si) {
  if (lesson?._id && slide?._id) return `${lesson._id}|${slide._id}`;
  return `${li}|${si}`;
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

/* -------------------- COMPONENT -------------------- */
export default function LessonView() {
  const { courseId, lessonId } = useParams();
  const [course, setCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [flatIndex, setFlatIndex] = useState(0);
  const [completed, setCompleted] = useState(new Set());

  // quiz state
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [answerStates, setAnswerStates] = useState({});
  const [matchingStates, setMatchingStates] = useState({});
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [shuffledPrompts, setShuffledPrompts] = useState([]);

  // certificate
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [autoSavedCertOnce, setAutoSavedCertOnce] = useState(false);
  const certificateRef = useRef(null);

  // fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fsScale, setFsScale] = useState(1);
  const fsWrapRef = useRef(null);
  const fsFrameRef = useRef(null);
  const fsSlideRef = useRef(null);
  const overlayTimerRef = useRef(null);

  // load course/user
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const courseRes = await axios.get(`/api/courses/${courseId}`, config);
        const normalized = normalizeCourse(courseRes.data);
        setCourse(normalized);

        try {
          const userRes = await axios.get("/api/users/profile", config);
          setUser(userRes.data);
        } catch { setUser(null); }

        setCompleted(loadCompleted(courseId));

        const flat = buildFlatMap(normalized);
        if (flat.length === 0) {
          setFlatIndex(0);
        } else if (lessonId) {
          const li = normalized.lessons.findIndex((l) => String(l._id) === String(lessonId));
          const firstIdx = flat.findIndex((p) => p.lessonIdx === li);
          setFlatIndex(firstIdx >= 0 ? firstIdx : 0);
        } else {
          const saved = loadPosition(courseId);
          if (saved) {
            const li = normalized.lessons.findIndex((l) => String(l._id) === String(saved.lessonId));
            if (li !== -1) {
              const safeSlide = clamp(Number(saved.slideIdx) || 0, normalized.lessons[li].slides.length);
              const idx = flat.findIndex((p) => p.lessonIdx === li && p.slideIdx === safeSlide);
              setFlatIndex(idx >= 0 ? idx : 0);
            } else setFlatIndex(0);
          } else setFlatIndex(0);
        }
        setError("");
      } catch (e) {
        console.error(e);
        setError("Failed to load course or lesson. Please check your enrollment status and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, lessonId]);

  const flat = useMemo(() => buildFlatMap(course), [course]);
  const pos = useMemo(() => {
    if (!flat.length) return { lessonIdx: 0, slideIdx: 0 };
    const i = Math.max(0, Math.min(flatIndex, flat.length - 1));
    return flat[i];
  }, [flat, flatIndex]);

  const activeLesson = course?.lessons?.[pos.lessonIdx] || null;
  const activeSlide  = activeLesson?.slides?.[pos.slideIdx] || null;
  const totalSlides  = flat.length;
  const currentQuiz  = activeSlide?.quiz ? normalizeQuiz(activeSlide.quiz) : null;

  // per-lesson counts (❗️restart numbering)
  const lessonSlides     = activeLesson?.slides || [];
  const lessonSlideNo    = (pos.slideIdx ?? 0) + 1;
  const lessonSlideTotal = lessonSlides.length;

  // first flat index for current lesson (used for lesson dots)
  const lessonFirstFlatIndex = useMemo(() => {
    return flat.findIndex((p) => p.lessonIdx === pos.lessonIdx && p.slideIdx === 0);
  }, [flat, pos.lessonIdx]);

  // persist position
  useEffect(() => {
    if (!course || !activeLesson || !activeSlide) return;
    savePosition(courseId, activeLesson._id, pos.slideIdx);
  }, [course, courseId, activeLesson?._id, activeSlide?._id, pos.slideIdx]);

  // quiz shuffle/reset on slide change
  useEffect(() => {
    if (!currentQuiz) {
      setShuffledAnswers([]); setShuffledPrompts([]);
      setSelectedAnswers({}); setQuizFeedback(""); setShowExplanation(false);
      setIsQuizCompleted(false); setAnswerStates({}); setMatchingStates({});
      return;
    }
    if (["single-choice", "multiple-choice"].includes(currentQuiz.type)) {
      setShuffledAnswers([...(currentQuiz.answers || [])].sort(() => Math.random() - 0.5));
    } else if (currentQuiz.type === "matching") {
      setShuffledPrompts([...(currentQuiz.prompts || [])].sort(() => Math.random() - 0.5));
    }
    setSelectedAnswers({}); setQuizFeedback(""); setShowExplanation(false);
    setIsQuizCompleted(false); setAnswerStates({}); setMatchingStates({});
  }, [currentQuiz?.type, pos.lessonIdx, pos.slideIdx]);

  // keyboard nav + overlay
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape" && isFullscreen) exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, flatIndex, totalSlides, completed, currentQuiz]);

  const isNextDisabled = !totalSlides || flatIndex >= totalSlides - 1;
  const isPrevDisabled = !totalSlides || flatIndex <= 0;

  const slideCompletedKey = useCallback(
    () => slideKey(activeLesson, activeSlide, pos.lessonIdx, pos.slideIdx),
    [activeLesson, activeSlide, pos.lessonIdx, pos.slideIdx]
  );

  const checkAllComplete = useCallback(
    (setArg = completed) => {
      if (!course) return false;
      const keys = new Set();
      course.lessons?.forEach((l, li) => l.slides?.forEach((s, si) => keys.add(slideKey(l, s, li, si))));
      let done = 0; keys.forEach((k) => { if (setArg.has(k)) done += 1; });
      return done >= keys.size && keys.size > 0;
    },
    [course, completed]
  );

  const markCompletedCurrentSlide = useCallback(async () => {
    if (!course || !activeLesson || !activeSlide) return;
    const key = slideCompletedKey();
    if (completed.has(key)) return;

    const newSet = new Set(completed);
    newSet.add(key);
    setCompleted(newSet);
    saveCompleted(courseId, newSet);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post(
        `/api/courses/${courseId}/complete-slide`,
        { lessonId: activeLesson._id, slideId: activeSlide._id },
        { headers }
      );
    } catch (e) {
      console.warn("complete-slide failed (non-fatal):", e?.response?.data || e?.message);
    }

    if (checkAllComplete(newSet) && !getCertShown(courseId)) {
      setShowCertificateModal(true);
      setCertShown(courseId);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        await axios.post(`/api/courses/${courseId}/complete-course`, { completed: true }, { headers });
      } catch {}
    }
  }, [course, activeLesson, activeSlide, completed, courseId, slideCompletedKey, checkAllComplete]);

  const handleNext = useCallback(() => {
    if (!totalSlides) return;
    if (currentQuiz) {
      const key = slideCompletedKey();
      if (!completed.has(key)) { setIsQuizModalOpen(true); return; }
    } else {
      markCompletedCurrentSlide();
    }
    setIsQuizModalOpen(false);
    setFlatIndex((i) => Math.max(0, Math.min(i + 1, totalSlides - 1)));
  }, [totalSlides, currentQuiz, completed, slideCompletedKey, markCompletedCurrentSlide]);

  const handlePrev = useCallback(() => {
    if (!totalSlides) return;
    setIsQuizModalOpen(false);
    setFlatIndex((i) => Math.max(0, Math.min(i - 1, totalSlides - 1)));
  }, [totalSlides]);

  const handleSlideSelect = (lessonIdx, slideIdx) => {
    if (!course) return;
    const idx = flat.findIndex((p) => p.lessonIdx === lessonIdx && p.slideIdx === slideIdx);
    setIsQuizModalOpen(false);
    setFlatIndex(idx >= 0 ? idx : 0);
    const l = course.lessons?.[lessonIdx];
    if (l?._id != null) savePosition(courseId, l._id, slideIdx);
  };

  // quiz interactions
  const onSingleChange = (id) => {
    if (isQuizCompleted) return;
    setSelectedAnswers({ id });
  };
  const onMultiChange = (id) => {
    if (isQuizCompleted) return;
    setSelectedAnswers((p) => ({ ...p, [id]: !p[id] }));
  };
  const handleMatch = (pid, ans) => {
    if (isQuizCompleted) return;
    setSelectedAnswers((p) => ({ ...p, [pid]: ans }));
  };

  const evaluateQuiz = () => {
    if (!currentQuiz) return { correct: false, answerStates: {}, matchingStates: {} };
    if (currentQuiz.type === "single-choice") {
      const correctId = currentQuiz.answers.find((a) => a.isCorrect)?._id;
      const selectedId = selectedAnswers.id;
      const correct = selectedId === correctId;
      const map = {};
      currentQuiz.answers.forEach((a) => {
        if (a._id === correctId && selectedId === correctId) map[a._id] = "correct";
        else if (a._id === selectedId && selectedId !== correctId) map[a._id] = "wrong-selected";
        else if (a._id === correctId && selectedId !== correctId) map[a._id] = "missed-correct";
        else map[a._id] = "neutral";
      });
      return { correct, answerStates: map, matchingStates: {} };
    }
    if (currentQuiz.type === "multiple-choice") {
      const correctIds = new Set(currentQuiz.answers.filter((a) => a.isCorrect).map((a) => a._id));
      const selectedIds = new Set(Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]));
      const correct = correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id));
      const map = {};
      currentQuiz.answers.forEach((a) => {
        const isSel = selectedIds.has(a._id);
        if (a.isCorrect && isSel) map[a._id] = "correct";
        else if (!a.isCorrect && isSel) map[a._id] = "wrong-selected";
        else if (a.isCorrect && !isSel) map[a._id] = "missed-correct";
        else map[a._id] = "neutral";
      });
      return { correct, answerStates: map, matchingStates: {} };
    }
    if (currentQuiz.type === "matching") {
      const states = {};
      let allCorrect = true;
      currentQuiz.prompts.forEach((p) => {
        const ok = selectedAnswers[p._id] === p.correctAnswer;
        states[p._id] = !!ok;
        if (!ok) allCorrect = false;
      });
      return { correct: allCorrect, answerStates: {}, matchingStates: states };
    }
    return { correct: false, answerStates: {}, matchingStates: {} };
  };

  const submitQuiz = async () => {
    if (!currentQuiz) return;
    const { correct, answerStates: aStates, matchingStates: mStates } = evaluateQuiz();
    setAnswerStates(aStates);
    setMatchingStates(mStates);
    setQuizFeedback(correct ? "Correct! Great job 🎉" : "Not quite. Review and try again.");
    setIsQuizCompleted(true);
    setShowExplanation(!correct);
    if (correct) { await markCompletedCurrentSlide(); }
  };

  // CERTIFICATE SAVE
  const userIdDisplay = user?.idNumber || user?.studentId || user?._id || user?.email || "—";
  const saveCertificateToDashboard = useCallback(
    async (canvas) => {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        try {
          const token = localStorage.getItem("token");
          const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
          await axios.post(
            "/api/certificates",
            {
              courseId,
              courseTitle: course?.title,
              issuedAt: new Date().toISOString(),
              userId: user?._id,
              userName: user?.name,
              idNumber: userIdDisplay,
              imageBase64: dataUrl,
            },
            { headers }
          );
          setCertSaved(courseId);
          return true;
        } catch {
          const key = `certificates:${user?._id || "me"}`;
          let list = [];
          try { list = JSON.parse(localStorage.getItem(key)) || []; } catch {}
          list.push({
            id: `${courseId}:${Date.now()}`,
            courseId,
            courseTitle: course?.title,
            issuedAt: new Date().toISOString(),
            idNumber: userIdDisplay,
            imageBase64: dataUrl,
          });
          localStorage.setItem(key, JSON.stringify(list));
          setCertSaved(courseId);
          return true;
        }
      } catch {
        return false;
      }
    },
    [courseId, course?.title, user?._id, user?.name, userIdDisplay]
  );

  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      if (!showCertificateModal || autoSavedCertOnce || getCertSaved(courseId)) return;
      if (!certificateRef.current) return;
      await new Promise((r) => setTimeout(r, 150));
      const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
      if (cancelled) return;
      const ok = await saveCertificateToDashboard(canvas);
      if (ok) setAutoSavedCertOnce(true);
    };
    go();
    return () => { cancelled = true; };
  }, [showCertificateModal, autoSavedCertOnce, courseId, saveCertificateToDashboard]);

  /* -------------------- FULLSCREEN LAYOUT -------------------- */
  const showOverlayNow = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlayVisible(false), 2500);
  }, []);
  const enterFullscreen = () => { setIsFullscreen(true); setOverlayVisible(true); setTimeout(recalcFsScale, 0); };
  const exitFullscreen  = () => { setIsFullscreen(false); setOverlayVisible(true); };

  const recalcFsScale = useCallback(() => {
    if (!fsWrapRef.current || !fsFrameRef.current || !fsSlideRef.current) return;
    const wrap = fsWrapRef.current.getBoundingClientRect();
    const P = 40; // padding around frame
    const availW = Math.max(200, wrap.width - P * 2);
    const availH = Math.max(200, wrap.height - P * 2 - 100); // room for dock
    const scale = Math.min(availW / CANVAS.W, availH / CANVAS.H);
    setFsScale(scale > 0 ? scale : 1);
  }, []);
  useEffect(() => {
    if (!isFullscreen) return;
    recalcFsScale();
    const onResize = () => recalcFsScale();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isFullscreen, recalcFsScale]);

  // overlay mouse move
  useEffect(() => {
    if (!isFullscreen) return;
    showOverlayNow();
  }, [isFullscreen, showOverlayNow]);

  /* -------------------- RENDER HELPERS -------------------- */
  const renderElement = (el, i) => {
    const isText = el.type === "text";
    const style = {
      position: "absolute",
      left: (el.position?.x ?? 0) * SX,
      top: (el.position?.y ?? 0) * SY,
      width: (el.size?.width ?? 0) * SX,
      height: isText ? "auto" : (el.size?.height ?? 0) * SY,
      zIndex: el.zIndex || 1,
      transform: `rotate(${el.rotation || 0}deg)`,
      overflow: "hidden",
    };
    if (isText) {
      const s = {
        fontSize: `${(el.fontSize || 16) * SY}px`,
        color: el.color || "#0f172a",
        fontWeight: el.isBold ? "bold" : "600",
        fontStyle: el.isItalic ? "italic" : "normal",
        width: "100%",
        height: "100%",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      };
      return (
        <div key={i} style={style}>
          <div dangerouslySetInnerHTML={{ __html: el.content || "" }} style={s} />
        </div>
      );
    }
    if (el.type === "image") {
      return (
        <div key={i} style={style} className="rounded-lg">
          {el.content ? (
            <img src={el.content} alt="" className="w-full h-full object-cover rounded-lg shadow" />
          ) : null}
        </div>
      );
    }
    if (el.type === "video") {
      const url = el.content || "";
      const yt = parseYouTubeId(url);
      const isVimeo = /vimeo\.com/.test(url);
      return (
        <div key={i} style={style} className="rounded-lg overflow-hidden">
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

  /* -------------------- UI STATES -------------------- */
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">Loading lesson…</div>;
  if (error)   return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-red-500">{error}</div>;
  if (!course) return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">Course not found.</div>;

  const hasAnySlides = lessonSlideTotal > 0; // per-lesson for empty states
  const progressPct = totalSlides ? Math.round(((flatIndex + 1) / totalSlides) * 100) : 0;
  const currentKey = slideKey(activeLesson, activeSlide, pos.lessonIdx, pos.slideIdx);
  const currentCompleted = completed.has(currentKey);
  const allDone = checkAllComplete();

  /* -------------------- MAIN RENDER -------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{course.title}</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{course.lessons?.[pos.lessonIdx]?.title || "Lesson"}</p>
            </div>
            <div className="w-full sm:w-96">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Progress</span><span>{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              {allDone && (
                <div className="mt-3">
                  <button
                    onClick={() => { setShowCertificateModal(true); setCertShown(courseId); }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                  >
                    View Certificate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main viewer */}
          <div className="w-full lg:flex-grow">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur shadow-xl overflow-hidden">
              <div className="p-3 md:p-5">
                {hasAnySlides ? (
                  <>
                    <div className="w-full flex justify-center">
                      {/* Outer frame OUTSIDE the slide */}
                      <div className="relative p-3 rounded-2xl">
                        <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-transparent"
                             style={{ boxShadow: "0 0 0 2px rgba(59,130,246,0.8), 0 10px 30px rgba(0,0,0,0.25), 0 0 50px rgba(59,130,246,0.2)" }} />
                        {/* Slide */}
                        <div
                          className="relative rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-950"
                          style={{
                            width: `${CANVAS.W}px`,
                            height: `${CANVAS.H}px`,
                            backgroundColor: activeSlide?.backgroundColor || "#FFFFFF",
                          }}
                        >
                          {(activeSlide?.elements || []).map((el, i) => renderElement(el, i))}
                        </div>
                      </div>
                    </div>

                    {/* Dots (per-lesson) */}
                    <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                      {Array.from({ length: lessonSlideTotal }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const idx = (lessonFirstFlatIndex >= 0 ? lessonFirstFlatIndex : 0) + i;
                            setFlatIndex(idx);
                          }}
                          className={`h-2.5 rounded-full transition-all ${
                            i === pos.slideIdx ? "w-8 bg-blue-600" : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
                          }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>

                    {/* Quiz button (normal mode) */}
                    {currentQuiz && !isQuizModalOpen && (
                      <div className="mt-5 flex justify-center">
                        {!currentCompleted ? (
                          <button
                            onClick={() => setIsQuizModalOpen(true)}
                            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition"
                          >
                            <span className="relative z-10">Start Quiz</span>
                            <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition"></span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-600 font-medium">✔ Quiz completed</span>
                            <button
                              onClick={() => {
                                // Review = show answers (without changing completion)
                                if (["single-choice", "multiple-choice"].includes(currentQuiz.type)) {
                                  const aStates = {};
                                  currentQuiz.answers.forEach((a) => (aStates[a._id] = a.isCorrect ? "correct" : "neutral"));
                                  setAnswerStates(aStates);
                                } else if (currentQuiz.type === "matching") {
                                  const mStates = {};
                                  currentQuiz.prompts.forEach((p) => (mStates[p._id] = true));
                                  setMatchingStates(mStates);
                                }
                                setIsQuizModalOpen(true);
                                setIsQuizCompleted(true);
                              }}
                              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black"
                            >
                              Review Quiz
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAnswers({});
                                setAnswerStates({});
                                setMatchingStates({});
                                setQuizFeedback("");
                                setShowExplanation(false);
                                setIsQuizCompleted(false);
                                setIsQuizModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              Retake
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full rounded-xl bg-slate-100 dark:bg-slate-950" style={{ height: `${CANVAS.H}px` }}>
                    <p className="text-slate-500">This course has no slides.</p>
                  </div>
                )}
              </div>

              {/* Footer bar (Fullscreen button moved here) */}
              <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
                <button
                  onClick={handlePrev}
                  disabled={isPrevDisabled}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                  <ArrowLeftIcon /> Previous
                </button>

                {/* ❗️Per-lesson counter */}
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  {hasAnySlides ? <>Slide {lessonSlideNo} / {lessonSlideTotal}</> : <>No Slides</>}
                </div>

                <div className="flex items-center gap-2">
                  {/* Fullscreen button here */}
                  <button
                    onClick={enterFullscreen}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-slate-900 text-white hover:bg-black shadow"
                    title="Fullscreen"
                  >
                    <Maximize2 size={18} /> Fullscreen
                  </button>

                  {flatIndex < totalSlides - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
                    >
                      Next <ArrowRightIcon />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (currentQuiz && !currentCompleted) { setIsQuizModalOpen(true); return; }
                        await markCompletedCurrentSlide();
                        if (checkAllComplete() && !getCertShown(courseId)) {
                          setShowCertificateModal(true);
                          setCertShown(courseId);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      {allDone ? "View Certificate" : "Finish Course"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur shadow-xl p-4 sticky top-24">
              <h3 className="font-bold mb-4 text-slate-900 dark:text-white text-xl">Course Content</h3>
              <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                {(course.lessons || []).map((lesson, lessonIdx) => {
                  const slides = lesson?.slides || [];
                  return (
                    <div key={lesson._id || lessonIdx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{lesson.title || `Lesson ${lessonIdx + 1}`}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{slides.length} slides</div>
                      </div>
                      <div className="px-2 pb-2">
                        {slides.length === 0 && <div className="px-2 py-2 text-sm text-slate-500">No slides</div>}
                        {slides.map((slide, slideIdx) => {
                          const thisFlatIdx = flat.findIndex((p) => p.lessonIdx === lessonIdx && p.slideIdx === slideIdx);
                          const isActive = thisFlatIdx === flatIndex;
                          const key = slideKey(lesson, slide, lessonIdx, slideIdx);
                          const done = completed.has(key);
                          return (
                            <div
                              key={slide._id || `${lessonIdx}-${slideIdx}`}
                              onClick={() => handleSlideSelect(lessonIdx, slideIdx)}
                              className={`px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1 ${
                                isActive ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-semibold"
                                         : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="truncate">
                                  {slide.title || (slide.quiz ? `Quiz: ${(slide.quiz.question || "").slice(0, 24)}…` : `Slide ${slideIdx + 1}`)}
                                </div>
                                {done && <span className="ml-3 text-emerald-600">✔</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* FULLSCREEN OVERLAY */}
        {isFullscreen && (
          <div
            ref={fsWrapRef}
            className="fixed inset-0 z-[100] bg-black"
            onMouseMove={showOverlayNow}
          >
            {/* Center frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Outer premium frame (OUTSIDE the slide) */}
              <div ref={fsFrameRef} className="relative p-3 rounded-2xl">
                {/* Glow frame */}
                <div
                  className="pointer-events-none absolute -inset-2 rounded-2xl"
                  style={{ boxShadow: "0 0 0 2px rgba(59,130,246,0.9), 0 14px 60px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.28)" }}
                />
                {/* Slide with CSS scale */}
                <div
                  ref={fsSlideRef}
                  className="origin-center rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.3)_inset] bg-slate-100 dark:bg-slate-950"
                  style={{
                    width: `${CANVAS.W}px`,
                    height: `${CANVAS.H}px`,
                    backgroundColor: activeSlide?.backgroundColor || "#FFFFFF",
                    transform: `scale(${fsScale})`,
                  }}
                >
                  {(activeSlide?.elements || []).map((el, i) => renderElement(el, i))}
                </div>
              </div>
            </div>

            {/* Overlay controls */}
            <div
              className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
                overlayVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Top bar */}
              <div className="pointer-events-auto absolute top-4 left-0 right-0 px-5 flex items-center justify-between">
                <div className="hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/70 bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Presentation Mode
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={recalcFsScale}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/90 hover:bg-white text-slate-900 shadow-md border border-white"
                    title="Recalculate Fit"
                  >
                    <RotateCw size={18} />
                    Fit
                  </button>
                  <button
                    onClick={exitFullscreen}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/90 hover:bg-white text-slate-900 shadow-md border border-white"
                    title="Exit Fullscreen"
                  >
                    <Minimize2 size={18} />
                    Exit
                  </button>
                </div>
              </div>

              {/* Bottom dock */}
              <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
                <div className="relative">
                  {/* glowing ring */}
                  <div className="absolute -inset-1 blur-lg rounded-2xl bg-gradient-to-r from-blue-500/30 via-fuchsia-500/30 to-emerald-500/30" />
                  {/* glass dock */}
                  <div className="relative flex items-center gap-3 rounded-2xl px-4 py-2.5 bg-white/10 backdrop-blur-xl border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
                    <button
                      onClick={handlePrev}
                      disabled={isPrevDisabled}
                      className="group disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white transition shadow-inner"
                      title="Previous (←)"
                    >
                      <ArrowLeftIcon size={18} />
                    </button>

                    <div className="px-3 py-1 text-white/80 text-sm hidden sm:block">
                      Slide {lessonSlideNo} / {lessonSlideTotal}
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={isNextDisabled}
                      className="group disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white transition shadow-inner"
                      title="Next (→)"
                    >
                      <ArrowRightIcon size={18} />
                    </button>

                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* Quiz actions inside fullscreen */}
                    {currentQuiz && !currentCompleted && (
                      <button
                        onClick={() => setIsQuizModalOpen(true)}
                        className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow"
                        title="Start Quiz"
                      >
                        <Eye size={18} /> Start Quiz
                      </button>
                    )}
                    {currentQuiz && currentCompleted && (
                      <>
                        <span className="text-emerald-400 text-sm font-medium">✔ Quiz completed</span>
                        <button
                          onClick={() => {
                            if (["single-choice", "multiple-choice"].includes(currentQuiz.type)) {
                              const aStates = {};
                              currentQuiz.answers.forEach((a) => (aStates[a._id] = a.isCorrect ? "correct" : "neutral"));
                              setAnswerStates(aStates);
                            } else if (currentQuiz.type === "matching") {
                              const mStates = {};
                              currentQuiz.prompts.forEach((p) => (mStates[p._id] = true));
                              setMatchingStates(mStates);
                            }
                            setIsQuizModalOpen(true);
                            setIsQuizCompleted(true);
                          }}
                          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-slate-900/90 hover:bg-black text-white font-semibold shadow"
                          title="Review Quiz"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAnswers({});
                            setAnswerStates({});
                            setMatchingStates({});
                            setQuizFeedback("");
                            setShowExplanation(false);
                            setIsQuizCompleted(false);
                            setIsQuizModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow"
                          title="Retake Quiz"
                        >
                          Retake
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ MODAL */}
        {isQuizModalOpen && currentQuiz && (
          <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="absolute top-3 right-3 p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                aria-label="Close"
              >
                <XCircleIcon size={22} />
              </button>

              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">{currentQuiz.question}</h2>

              {["single-choice", "multiple-choice"].includes(currentQuiz.type) && (
                <div className="space-y-3">
                  {shuffledAnswers.map((a) => {
                    const checked = currentQuiz.type === "single-choice" ? selectedAnswers.id === a._id : !!selectedAnswers[a._id];
                    const state = answerStates[a._id] || "neutral";
                    const stateCls =
                      state === "correct" ? "border-green-500 bg-green-50"
                      : state === "wrong-selected" ? "border-rose-500 bg-rose-50"
                      : state === "missed-correct" ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 dark:border-slate-700";
                    return (
                      <label key={a._id} className={`flex items-center gap-3 p-3 rounded-xl border ${stateCls} cursor-pointer transition`}>
                        <input
                          type={currentQuiz.type === "single-choice" ? "radio" : "checkbox"}
                          checked={checked}
                          onChange={() =>
                            currentQuiz.type === "single-choice"
                              ? onSingleChange(a._id)
                              : onMultiChange(a._id)
                          }
                          className="h-5 w-5"
                        />
                        <span className="text-slate-800 dark:text-slate-200">{a.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuiz.type === "matching" && (
                <div className="space-y-4">
                  {shuffledPrompts.map((p) => {
                    const ok = matchingStates[p._id];
                    return (
                      <div key={p._id} className={`flex items-center justify-between gap-4 p-3 rounded-xl border ${ok ? "border-green-500 bg-green-50" : "border-slate-200 dark:border-slate-700"}`}>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{p.prompt}</div>
                        <select
                          disabled={isQuizCompleted}
                          value={selectedAnswers[p._id] || ""}
                          onChange={(e) => handleMatch(p._id, e.target.value)}
                          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        >
                          <option value="" disabled>-- Select --</option>
                          {currentQuiz.matchOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {quizFeedback && (
                <div className={`mt-5 px-4 py-3 rounded-xl font-semibold ${quizFeedback.startsWith("Correct") ? "bg-green-600 text-white" : "bg-rose-600 text-white"}`}>
                  {quizFeedback}
                </div>
              )}

              {showExplanation && currentQuiz.explanation && (
                <div className="mt-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <strong className="block mb-1">Explanation:</strong>
                  {currentQuiz.explanation}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <button onClick={() => setIsQuizModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700">
                  Close
                </button>
                <button
                  onClick={() => {
                    if (!currentQuiz) return;
                    if (["single-choice", "multiple-choice"].includes(currentQuiz.type)) {
                      const aStates = {};
                      currentQuiz.answers.forEach((a) => (aStates[a._id] = a.isCorrect ? "correct" : "neutral"));
                      setAnswerStates(aStates);
                    } else if (currentQuiz.type === "matching") {
                      const mStates = {};
                      currentQuiz.prompts.forEach((p) => (mStates[p._id] = true));
                      setMatchingStates(mStates);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Reveal Answer
                </button>
                {!isQuizCompleted ? (
                  <button onClick={submitQuiz} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedAnswers({});
                      setAnswerStates({});
                      setMatchingStates({});
                      setQuizFeedback("");
                      setShowExplanation(false);
                      setIsQuizCompleted(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white"
                  >
                    Retake
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CERTIFICATE MODAL */}
        {showCertificateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110]">
            <div className="relative w-full max-w-5xl h-3/4 rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl p-6 md:p-12 text-center flex flex-col items-center justify-center overflow-auto">
              <button onClick={() => setShowCertificateModal(false)} className="absolute top-4 right-4 p-2 rounded-full bg-rose-600 hover:bg-rose-700 transition-colors">
                <XCircleIcon size={30} />
              </button>

              <CertificateCard ref={certificateRef} user={user} course={course} idDisplay={userIdDisplay} />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={async () => {
                    if (!certificateRef.current) return;
                    const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
                    canvas.toBlob((blob) => {
                      saveAs(blob, `certificate-${(course.title || "").replace(/\s+/g, "-")}-${userIdDisplay}.png`);
                    });
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
                >
                  <Download size={20} /> Download Certificate
                </button>

                <button
                  onClick={async () => {
                    if (!certificateRef.current) return;
                    const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
                    await saveCertificateToDashboard(canvas);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
                >
                  Save to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- CERTIFICATE CARD -------------------- */
const CertificateCard = React.forwardRef(function CertificateCard({ user, course, idDisplay }, ref) {
  return (
    <div
      ref={ref}
      className="w-full h-full p-8 md:p-12 flex flex-col items-center justify-center text-center bg-slate-50 text-slate-900 border-8 border-blue-600 rounded-xl"
    >
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-blue-700">Certificate of Completion</h1>
      <p className="text-xl md:text-2xl mt-4">This is to certify that</p>
      <h2 className="text-4xl md:text-5xl font-bold my-4 md:my-8">{user?.name || "Student"}</h2>

      <div className="mt-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-lg md:text-xl font-semibold">
        ID: {idDisplay}
      </div>

      <p className="text-xl md:text-2xl mt-8">has successfully completed the course</p>
      <h3 className="text-3xl md:text-4xl font-semibold my-4">{course?.title}</h3>
      <p className="text-lg md:text--xl">on {new Date().toLocaleDateString()}</p>
      <div className="mt-8 md:mt-12 text-lg md:text-2xl">
        <p>_______________________</p>
        <p className="mt-2">POCUS World Instructor</p>
        <p className="text-base md:text-lg">{course?.creator?.fullName}</p>
      </div>
    </div>
  );
});
