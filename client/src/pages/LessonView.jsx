import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { ChevronDownIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, Download } from 'lucide-react';

const getVideoElement = (element) => {
    const url = element.content;
    let embedUrl = null;
    try {
        if (url.includes("youtube.com/watch?v=")) {
            const videoId = new URL(url).searchParams.get("v");
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("youtu.be/")) {
            const videoId = new URL(url).pathname.split("/")[1];
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {
        console.error("Error parsing video URL:", e);
    }

    if (embedUrl) {
        return <iframe src={embedUrl} title="slide video" className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
    }
    return <video src={url} controls className="w-full h-full object-cover"></video>;
};

const LessonView = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [course, setCourse] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeLessonIndex, setActiveLessonIndex] = useState(0);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [openLessons, setOpenLessons] = useState({});
    
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false); 

    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [quizFeedback, setQuizFeedback] = useState('');
    const [showExplanation, setShowExplanation] = useState(false);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [isFinalExamPassed, setIsFinalExamPassed] = useState(false);
    const [showCertificateModal, setShowCertificateModal] = useState(false);

    const canvasRef = useRef(null);
    const certificateRef = useRef(null);
    const [scale, setScale] = useState(1);
    const EDITOR_BASE_WIDTH = 960;
    const isInitialMount = useRef(true);

    const activeLesson = course?.lessons[activeLessonIndex];
    const activeSlide = activeLesson?.slides[activeSlideIndex];

    const safeParseInt = (value) => parseInt(value, 10) || 0;

    const handleCloseQuizModal = () => {
        setIsQuizModalOpen(false);
        setSelectedAnswers({});
        setQuizFeedback('');
        setShowExplanation(false);
        setIsQuizCompleted(false);
    };
    
    const currentQuizProgress = useMemo(() => {
        if (!user || !user.enrolledCourses || !activeLesson || !activeSlide) return null;
        const enrollment = user.enrolledCourses.find(e => e.course?._id === courseId);
        if (!enrollment || !enrollment.progress) return null;

        return enrollment.progress.find(p => 
            p.lessonId.toString() === activeLesson._id.toString() &&
            p.slideId.toString() === activeSlide._id.toString()
        );
    }, [user, courseId, activeLesson, activeSlide]);

    const allPreviousQuizzesCompleted = useMemo(() => {
        if (!user || !user.enrolledCourses || !course) return false;

        const enrollment = user.enrolledCourses.find(c => c.course?._id === courseId);
        if (!enrollment) return false;

        const regularLessons = course.lessons.filter(lesson => !lesson.isFinalExam);
        const allQuizzes = regularLessons.flatMap(lesson =>
            lesson.slides.filter(slide => slide.quiz).map(slide => ({
                lessonId: lesson._id.toString(),
                slideId: slide._id.toString(),
            }))
        );
        
        const progressQuizzes = enrollment.progress.filter(Boolean).map(p => ({
            lessonId: p.lessonId.toString(),
            slideId: p.slideId.toString(),
            isCorrect: p.isCorrect,
        }));

        const completedQuizzes = progressQuizzes.filter(qa => qa.isCorrect).map(qa => `${qa.lessonId}-${qa.slideId}`);
        const allCompleted = allQuizzes.every(quiz => completedQuizzes.includes(`${quiz.lessonId}-${quiz.slideId}`));

        return allQuizzes.length === completedQuizzes.length && allCompleted;
    }, [user, course, courseId]);

    const shuffledAnswers = useMemo(() => {
        if (activeSlide?.quiz?.answers) {
            return [...activeSlide.quiz.answers].sort(() => Math.random() - 0.5);
        }
        return [];
    }, [activeSlide]);

    const shuffledPrompts = useMemo(() => {
        if (activeSlide?.quiz?.matchPrompts) {
            return [...activeSlide.quiz.matchPrompts].sort(() => Math.random() - 0.5);
        }
        return [];
    }, [activeSlide]);
    
    // FIX: Combined all related variables into a single useMemo hook to prevent redeclaration errors
    const { hasQuiz, isFinalExamLesson, hasPassedFinalExam, isQuizCorrect, isNextDisabled } = useMemo(() => {
        const hasQuiz = !!activeSlide?.quiz;
        const isFinalExamLesson = activeLesson?.isFinalExam;
        const hasPassedFinalExam = isFinalExamPassed;
        const isQuizCorrect = quizFeedback === 'Correct!';
        
        let isNextDisabled = true;
        if (activeLesson && course) {
            const isLastSlideOfLastLesson = activeLessonIndex === course.lessons.length - 1 && activeSlideIndex === activeLesson.slides.length - 1;

            if (hasQuiz) {
                if (isFinalExamLesson) {
                    isNextDisabled = !hasPassedFinalExam;
                } else {
                    isNextDisabled = !isQuizCorrect;
                }
            } else {
                isNextDisabled = isLastSlideOfLastLesson;
            }
        }
        
        return { hasQuiz, isFinalExamLesson, hasPassedFinalExam, isQuizCorrect, isNextDisabled };
    }, [activeLesson, activeSlide, activeLessonIndex, activeSlideIndex, course, isFinalExamPassed, quizFeedback]);

    
    const saveProgress = useCallback(async () => {
        const token = localStorage.getItem('token');
        const currentLesson = course?.lessons[activeLessonIndex];
        if (token && currentLesson) {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            try {
                await axios.put(`/api/courses/${courseId}/progress`, { lessonId: currentLesson._id, slideIndex: activeSlideIndex }, config);
            } catch (error) {
                console.error("Could not save progress", error);
            }
        }
    }, [course, courseId, activeLessonIndex, activeSlideIndex]);

    const generateAndSaveCertificate = async () => {
        if (!certificateRef.current) return;

        try {
            const canvas = await html2canvas(certificateRef.current, { scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');

            const token = localStorage.getItem('token');
            if (token) {
                const config = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
                await axios.put(`/api/courses/${courseId}/save-certificate`, { certificateData: dataUrl }, config);
            }

            saveAs(dataUrl, `Certificate_of_Completion_${course.title}.png`);
        } catch (error) {
            console.error("Error generating or saving certificate", error);
            alert("An error occurred while generating and saving the certificate.");
        }
    };

    useEffect(() => {
        const fetchCourseData = async () => {
            if (course && course._id === courseId && course.lessons.some(l => l._id === lessonId)) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data } = await axios.get(`/api/courses/${courseId}`);
                const token = localStorage.getItem('token');
                const userRes = token ? await axios.get('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }) : null;

                if (!data) {
                    setError('Course data not found.');
                    setLoading(false);
                    return;
                }

                setCourse(data);
                if (userRes) {
                    setUser(userRes.data);
                    const enrollment = userRes.data.enrolledCourses.find(e => e.course?._id === courseId);
                    if (enrollment?.isCompleted) {
                        setIsFinalExamPassed(true);
                        if (enrollment.certificate) {
                            setShowCertificateModal(false); 
                        }
                    }
                }
                
                if (data.lessons && data.lessons.length > 0) {
                    const initialLessonIndex = data.lessons.findIndex(l => l._id === lessonId);
                    
                    if (initialLessonIndex !== -1) {
                        setActiveLessonIndex(initialLessonIndex);
                        setOpenLessons({ [initialLessonIndex]: true });
                        const initialSlideIndex = parseInt(searchParams.get('slideIndex')) || 0;
                        setActiveSlideIndex(initialSlideIndex);
                    } else {
                        const firstLessonId = data.lessons[0]._id;
                        navigate(`/learn/${courseId}/lesson/${firstLessonId}?slideIndex=0`, { replace: true });
                    }
                } else {
                    setError('This course has no lessons yet.');
                }
            } catch (err) {
                console.error("Failed to fetch data:", err);
                setError('Failed to load course. Please check the URL.');
            } finally {
                setLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId, lessonId, searchParams, navigate, course]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        saveProgress();
        setSelectedAnswers({});
        setQuizFeedback('');
        setShowExplanation(false);
        setIsQuizCompleted(false);
        
        if (activeSlide?.quiz) {
            setIsQuizModalOpen(true);
        } else {
            setIsQuizModalOpen(false);
        }
        
        if (!isFinalExamLesson) {
            setIsFinalExamPassed(false);
            setShowCertificateModal(false);
        }

    }, [activeSlideIndex, activeLessonIndex, courseId, course, saveProgress, activeSlide, isFinalExamLesson]);

    useEffect(() => {
        const updateScale = () => {
            if (canvasRef.current) {
                const { width } = canvasRef.current.getBoundingClientRect();
                const scaleValue = (activeSlide?.quiz || isFinalExamLesson) ? (width / 2) / EDITOR_BASE_WIDTH : width / EDITOR_BASE_WIDTH;
                setScale(scaleValue);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [loading, activeSlide, activeLesson, isFinalExamLesson]);
    
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            saveProgress();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveProgress]);

    const handleSlideSelect = (lessonIdx, slideIdx) => {
        const newLessonId = course.lessons[lessonIdx]._id;
        navigate(`/learn/${courseId}/lesson/${newLessonId}?slideIndex=${slideIdx}`, { replace: true });
        setActiveLessonIndex(lessonIdx);
        setActiveSlideIndex(slideIdx);
    };

    const toggleLessonAccordion = (index) => {
        setOpenLessons(prev => ({ ...prev, [index]: !prev[index] }));
    };
    
    const goToNextSlide = () => {
        if (activeLessonIndex === null || activeSlideIndex === null || !course) return;
    
        const currentLesson = course.lessons[activeLessonIndex];
        const nextSlideIndex = activeSlideIndex + 1;
        
        if (nextSlideIndex < currentLesson.slides.length) {
            handleSlideSelect(activeLessonIndex, nextSlideIndex);
        } else if (activeLessonIndex < course.lessons.length - 1) {
            const nextLessonIndex = activeLessonIndex + 1;
            handleSlideSelect(nextLessonIndex, 0);
        }
    };
    
    const goToPreviousSlide = () => {
        if (activeLessonIndex === null || activeSlideIndex === null || !course) return;
    
        const previousSlideIndex = activeSlideIndex - 1;
        
        if (previousSlideIndex >= 0) {
            handleSlideSelect(activeLessonIndex, previousSlideIndex);
        } else if (activeLessonIndex > 0) {
            const prevLessonIndex = activeLessonIndex - 1;
            const prevLesson = course.lessons[prevLessonIndex];
            const lastSlideOfPrevLesson = prevLesson.slides.length - 1;
            handleSlideSelect(prevLessonIndex, lastSlideOfPrevLesson);
        }
    };

    const handleQuizSubmit = async () => {
        const quizType = activeSlide.quiz.type;
        let payload;

        if (quizType === 'single-choice') {
            payload = selectedAnswers.id;
        } else if (quizType === 'multiple-choice') {
            payload = Object.keys(selectedAnswers).filter(key => selectedAnswers[key]);
        } else if (quizType === 'matching') {
            payload = selectedAnswers;
        }

        if (!payload || Object.keys(payload).length === 0) {
            setQuizFeedback('Please select an answer.');
            return;
        }

        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            const { data } = await axios.post(`/api/courses/${courseId}/lesson/${lessonId}/slide/${activeSlide._id}/quiz`, { answers: payload }, config);
            setQuizFeedback(data.message);
            if (data.correct) {
                setIsQuizCompleted(true);
                setShowExplanation(true);
                
                setUser(prevUser => {
                    const updatedUser = { ...prevUser };
                    const enrollment = updatedUser.enrolledCourses.find(e => e.course?._id === courseId);
                    if (enrollment) {
                        const existingProgress = enrollment.progress.find(p => p.lessonId?.toString() === lessonId && p.slideId?.toString() === activeSlide._id.toString());
                        if (existingProgress) {
                            existingProgress.isCorrect = true;
                        } else {
                            enrollment.progress.push({
                                lessonId: lessonId,
                                slideId: activeSlide._id,
                                isCorrect: true
                            });
                        }
                    }
                    return updatedUser;
                });
            }
        } catch (error) {
            console.error("Quiz submission error", error);
            setQuizFeedback('An error occurred. Please try again.');
        }
    };

    const handleFinalExamSubmit = async () => {
        if (!isFinalExamLesson) return;
        
        const quizType = activeSlide.quiz.type;
        let payload;

        if (quizType === 'single-choice') {
            payload = selectedAnswers.id;
        } else if (quizType === 'multiple-choice') {
            payload = Object.keys(selectedAnswers).filter(key => selectedAnswers[key]);
        } else if (quizType === 'matching') {
            payload = selectedAnswers;
        }
        
        if (!payload || Object.keys(payload).length === 0) {
            setQuizFeedback('Please select an answer.');
            return;
        }
        
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            const { data } = await axios.post(`/api/courses/${courseId}/lesson/${activeLesson._id}/final-exam`, { answers: payload }, config);
            setQuizFeedback(data.message);
            if (data.correct) {
                setIsFinalExamPassed(true);
                setShowExplanation(true);
                setShowCertificateModal(true);
            }
        } catch (error) {
            console.error("Final exam submission error", error);
            setQuizFeedback('An error occurred. Please try again.');
        }
    };
    
    const closeCertificateModal = () => {
        setShowCertificateModal(false);
    };

    const handleSingleChoiceSelect = (answerId) => setSelectedAnswers({ id: answerId });
    const handleMultiChoiceSelect = (answerId) => setSelectedAnswers(prev => ({ ...prev, [answerId]: !prev[answerId] }));
    const handleMatchingSelect = (promptId, value) => setSelectedAnswers(prev => ({ ...prev, [promptId]: value }));
    
    // FIX: Variable declarations are outside of the JSX render to prevent syntax errors.
    const isNextDisabledAfterMemo = isNextDisabled; // Use the memoized value
    const hasQuizAfterMemo = hasQuiz; // Use the memoized value

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">Loading Lesson...</div>;
    if (error) return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-red-500">{error}</div>;
    
    if (!course) return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">Course data not found.</div>;
    if (!activeLesson) return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">This course has no lessons.</div>;


    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {course && (
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="w-full lg:flex-grow order-1 lg:order-1">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="p-6 lg:p-8">
                                    <p className="text-blue-600 dark:text-blue-400 font-semibold">{course.title}</p>
                                    {activeLesson && (
                                        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mt-1">{activeLesson.title}</h1>
                                    )}
                                </div>
                                <div className="p-2 md:p-4">
                                    {activeSlide ? (
                                        <>
                                        <div className="w-full">
                                            <div ref={canvasRef} className="relative w-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden" style={{ backgroundColor: activeSlide?.backgroundColor || undefined }}>
                                                {activeSlide?.elements.map((element, index) => {
                                                    const style = {
                                                        position: 'absolute',
                                                        transform: `translateX(${safeParseInt(element.position.x) * scale}px) translateY(${safeParseInt(element.position.y) * scale}px) rotate(${element.rotation || 0}deg)`,
                                                        width: `${safeParseInt(element.size.width) * scale}px`,
                                                        height: element.size.height === 'auto' ? 'auto' : `${safeParseInt(element.size.height) * scale}px`,
                                                        zIndex: element.zIndex || 1,
                                                    };
                                                    return (
                                                        <div key={index} style={style}>
                                                            {element.type === 'text' && (
                                                                <div
                                                                    dangerouslySetInnerHTML={{ __html: element.content }}
                                                                    style={{
                                                                        fontSize: `${safeParseInt(element.fontSize) * scale}px`,
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordBreak: 'break-word',
                                                                        color: element.color,
                                                                        fontWeight: element.isBold ? 'bold' : 'normal',
                                                                        fontStyle: element.isItalic ? 'italic' : 'normal'
                                                                    }}
                                                                />
                                                            )}
                                                            {element.type === 'image' && <img src={element.content} alt="" className="w-full h-full object-cover" />}
                                                            {element.type === 'video' && getVideoElement(element)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Conditionally render a button to open the quiz modal */}
                                            {hasQuiz && !isQuizModalOpen && (
                                                <div className="mt-4 text-center">
                                                    <button onClick={() => setIsQuizModalOpen(true)} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg">
                                                        Start Quiz
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Quiz Modal is now an overlay, not a replacement */}
                                        {isQuizModalOpen && hasQuiz && (
                                            <div className="absolute inset-0 bg-gray-900 bg-opacity-80 z-[90] flex items-center justify-center p-4">
                                                <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 relative">
                                                    {/* The X button now closes the quiz modal */}
                                                    <button onClick={handleCloseQuizModal} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">
                                                        <XCircleIcon size={24} />
                                                    </button>
                                                    <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                                                        {activeSlide.quiz.question}
                                                    </h2>
                                                    {hasPassedFinalExam && isFinalExamLesson ? (
                                                        <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                                                            <p className="font-semibold">You have passed the final exam! You can now download your certificate from your dashboard.</p>
                                                        </div>
                                                    ) : (
                                                    <>
                                                        {(activeSlide.quiz.type === 'single-choice' || activeSlide.quiz.type === 'multiple-choice') && (
                                                            <div className="space-y-3">
                                                                {shuffledAnswers.map((answer) => (
                                                                    <div 
                                                                        key={answer._id} 
                                                                        onClick={() => !isQuizCompleted && (activeSlide.quiz.type === 'single-choice' ? handleSingleChoiceSelect(answer._id) : handleMultiChoiceSelect(answer._id))}
                                                                        className={`p-4 rounded-lg text-left transition flex items-center gap-4 cursor-pointer border-2 ${selectedAnswers[answer._id] || selectedAnswers.id === answer._id ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500' : 'bg-white dark:bg-slate-700/50 border-transparent hover:border-blue-400'}`}
                                                                    >
                                                                        <input type={activeSlide.quiz.type === 'single-choice' ? 'radio' : 'checkbox'} readOnly checked={selectedAnswers[answer._id] || selectedAnswers.id === answer._id} className="h-5 w-5 pointer-events-none text-blue-600 focus:ring-blue-500" />
                                                                        <span className="font-medium text-slate-700 dark:text-slate-200">{answer.text}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {activeSlide.quiz.type === 'matching' && (
                                                            <div className="space-y-4 w-full max-w-3xl mx-auto">
                                                                {shuffledPrompts.map(prompt => (
                                                                    <div key={prompt._id} className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                                                                        <label className="mr-4 font-semibold text-slate-700 dark:text-slate-300">{prompt.prompt}</label>
                                                                        <select onChange={(e) => handleMatchingSelect(prompt._id, e.target.value)} value={selectedAnswers[prompt._id] || ''} disabled={isQuizCorrect} className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 w-48">
                                                                            <option value="" disabled>--Select--</option>
                                                                            {activeSlide.quiz.matchOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                        </select>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {quizFeedback &&
                                                            <div className={`mt-6 p-3 rounded-lg text-white font-semibold flex items-center gap-2 max-w-lg mx-auto ${isQuizCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                                {isQuizCorrect ? <CheckCircleIcon /> : <XCircleIcon />}
                                                                <span>{quizFeedback}</span>
                                                            </div>
                                                        }
                                                        {showExplanation && activeSlide.quiz.explanation &&
                                                            <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                                                                <b className="block mb-1">Explanation:</b>
                                                                {activeSlide.quiz.explanation}
                                                            </div>
                                                        }
                                                        <div className="mt-6 text-center">
                                                            {isFinalExamLesson && activeSlide?.quiz ? (
                                                                <button onClick={handleFinalExamSubmit} disabled={isFinalExamPassed} className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-lg">Submit Final Exam</button>
                                                            ) : (
                                                                <button onClick={handleQuizSubmit} disabled={isQuizCompleted} className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-lg">Submit Answer</button>
                                                            )}
                                                        </div>
                                                    </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg"><p className="text-gray-500">This slide is empty.</p></div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-4 p-4 border-t border-slate-200 dark:border-slate-700">
                                    <button onClick={goToPreviousSlide} disabled={activeLessonIndex === 0 && activeSlideIndex === 0} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition shadow-sm flex items-center">
                                        <ArrowLeftIcon /> Previous
                                    </button>
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Slide {activeSlideIndex + 1} / {activeLesson?.slides?.length || 0}</span>
                                    <button onClick={goToNextSlide} disabled={isNextDisabled} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-sm flex items-center">
                                        Next <ArrowRightIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-96 flex-shrink-0 order-2 lg:order-2">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-24">
                                <h3 className="font-bold mb-4 text-gray-900 dark:text-white text-xl">Course Content</h3>
                                <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2">
                                    {course.lessons.map((lesson, lessonIdx) => {
                                        return (
                                            <div key={lesson._id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                                <button onClick={() => toggleLessonAccordion(lessonIdx)} className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                                                    <span>{lesson.title}</span>
                                                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${openLessons[lessonIdx] ? 'rotate-180' : ''}`} />
                                                </button>
                                                {openLessons[lessonIdx] && (
                                                    <div className="pl-4 py-2">
                                                        {lesson.slides.map((slide, slideIdx) => (
                                                            <div
                                                                key={slide._id}
                                                                onClick={() => handleSlideSelect(lessonIdx, slideIdx)}
                                                                className={`block p-2 rounded-md cursor-pointer transition-colors ${activeLessonIndex === lessonIdx && activeSlideIndex === slideIdx ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                                                                {slide.title || (slide.quiz ? `Quiz: ${slide.quiz.question.substring(0, 20)}...` : `Slide ${slideIdx + 1}`)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showCertificateModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[999]">
                    <div className="relative w-full max-w-5xl h-3/4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-12 text-center flex flex-col items-center justify-center overflow-auto">
                        <button onClick={closeCertificateModal} className="absolute top-4 right-4 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors">
                            <XCircleIcon size={32} />
                        </button>
                        <div ref={certificateRef} className="w-full h-full p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 border-8 border-blue-600 dark:border-blue-400">
                            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-blue-600 dark:text-blue-400">Certificate of Completion</h1>
                            <p className="text-xl md:text-2xl mt-4 text-gray-700 dark:text-gray-300">This is to certify that</p>
                            <h2 className="text-4xl md:text-5xl font-bold my-4 md:my-8 text-black dark:text-white">{user?.name}</h2>
                            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">ID: {user?.idNumber}</p>
                            <p className="text-xl md:text-2xl mt-8 text-gray-700 dark:text-gray-300">has successfully completed the course</p>
                            <h3 className="text-3xl md:text-4xl font-semibold my-4 text-gray-800 dark:text-gray-200">{course?.title}</h3>
                            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">on {new Date().toLocaleDateString()}</p>
                            <div className="mt-8 md:mt-12 text-lg md:text-2xl text-gray-700 dark:text-gray-300">
                                <p>_______________________</p>
                                <p className="mt-2">POCUS World Instructor</p>
                                <p className="text-base md:text-lg">{course?.creator?.fullName}</p>
                            </div>
                        </div>
                        <button onClick={generateAndSaveCertificate} className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg">
                            <Download size={20} /> Download & Save Certificate
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonView;