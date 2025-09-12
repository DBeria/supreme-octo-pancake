import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { ChevronDownIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Helper function to safely parse integer (not used in this version)
/* const safeParseInt = (value) => parseInt(value, 10) || 0; */
// You can remove the scale and EDITOR_BASE_WIDTH states

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
    
    // Quiz state management
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [quizFeedback, setQuizFeedback] = useState('');
    const [showExplanation, setShowExplanation] = useState(false);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [isFinalExamPassed, setIsFinalExamPassed] = useState(false);
    const [showCertificateModal, setShowCertificateModal] = useState(false);
    
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    const [shuffledPrompts, setShuffledPrompts] = useState([]);

    const certificateRef = useRef(null);

    const activeLesson = course?.lessons[activeLessonIndex];
    const activeSlide = activeLesson?.slides[activeSlideIndex];
    const isFinalExamLesson = activeLesson?.isFinalExam;
    const hasPassedFinalExam = user?.completedCourses?.some(c => c.courseId === courseId && c.passedFinalExam);
    const hasQuiz = activeSlide?.quiz;
    const isNextDisabled = useMemo(() => {
        if (!activeLesson) return true;
        if (isQuizModalOpen && !isQuizCompleted) return true;
        if (isFinalExamLesson && !hasPassedFinalExam) return true;
        if (activeSlideIndex < activeLesson.slides.length - 1) return false;
        if (activeLessonIndex < course.lessons.length - 1) return false;
        return true;
    }, [activeLesson, activeSlideIndex, activeLessonIndex, course, isQuizModalOpen, isQuizCompleted, isFinalExamLesson, hasPassedFinalExam]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const courseRes = await axios.get(`/api/courses/${courseId}`, config);
                setCourse(courseRes.data);

                const userRes = await axios.get('/api/users/profile', config);
                setUser(userRes.data);

                if (lessonId) {
                    const lessonIdx = courseRes.data.lessons.findIndex(l => l._id === lessonId);
                    if (lessonIdx !== -1) {
                        setActiveLessonIndex(lessonIdx);
                        setOpenLessons(prev => ({ ...prev, [lessonIdx]: true }));
                    }
                }
            } catch (err) {
                setError('Failed to load course or lesson. Please check your enrollment status and try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, lessonId]);

    useEffect(() => {
        if (activeSlide?.quiz) {
            if (activeSlide.quiz.type === 'single-choice' || activeSlide.quiz.type === 'multiple-choice') {
                const shuffled = [...activeSlide.quiz.answers].sort(() => Math.random() - 0.5);
                setShuffledAnswers(shuffled);
            } else if (activeSlide.quiz.type === 'matching') {
                const shuffled = [...activeSlide.quiz.prompts].sort(() => Math.random() - 0.5);
                setShuffledPrompts(shuffled);
            }
            setSelectedAnswers({});
            setQuizFeedback('');
            setShowExplanation(false);
            setIsQuizCompleted(false);
        }
    }, [activeSlide]);

    const handleSingleChoiceSelect = useCallback((answerId) => {
        if (!isQuizCompleted) {
            setSelectedAnswers({ id: answerId });
        }
    }, [isQuizCompleted]);

    const handleMultiChoiceSelect = useCallback((answerId) => {
        if (!isQuizCompleted) {
            setSelectedAnswers(prev => ({
                ...prev,
                [answerId]: !prev[answerId]
            }));
        }
    }, [isQuizCompleted]);

    const handleMatchingSelect = useCallback((promptId, answer) => {
        if (!isQuizCompleted) {
            setSelectedAnswers(prev => ({
                ...prev,
                [promptId]: answer
            }));
        }
    }, [isQuizCompleted]);
    
    const handleQuizSubmit = useCallback(async () => {
        if (!activeSlide || !activeSlide.quiz) return;

        const isCorrect = (quiz) => {
            switch (quiz.type) {
                case 'single-choice':
                    return selectedAnswers.id === quiz.answers.find(a => a.isCorrect)?._id;
                case 'multiple-choice':
                    const correctIds = new Set(quiz.answers.filter(a => a.isCorrect).map(a => a._id));
                    const selectedIds = new Set(Object.keys(selectedAnswers).filter(key => selectedAnswers[key]));
                    return correctIds.size === selectedIds.size && [...correctIds].every(id => selectedIds.has(id));
                case 'matching':
                    return quiz.prompts.every(prompt => selectedAnswers[prompt._id] === prompt.correctAnswer);
                default:
                    return false;
            }
        };
        const correct = isCorrect(activeSlide.quiz);
        setQuizFeedback(correct ? 'Correct! Well done.' : 'Incorrect. Please review the material.');
        setIsQuizCompleted(true);
        setShowExplanation(!correct);

        if (correct) {
            try {
                const token = localStorage.getItem('token');
                await axios.post(`/api/courses/${courseId}/complete-slide`, {
                    lessonId: activeLesson._id,
                    slideId: activeSlide._id
                }, { headers: { 'Authorization': `Bearer ${token}` } });
                console.log("Slide completion recorded.");
            } catch (err) {
                console.error("Failed to record slide completion:", err);
            }
        }
    }, [activeSlide, selectedAnswers, courseId, activeLesson]);

    const handleFinalExamSubmit = async () => {
        if (!activeSlide || !activeSlide.quiz) return;

        const isExamCorrect = activeSlide.quiz.prompts.every(prompt => selectedAnswers[prompt._id] === prompt.correctAnswer);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/courses/${courseId}/complete-final-exam`, {
                lessonId: activeLesson._id,
                isPassed: isExamCorrect,
                userAnswers: selectedAnswers,
            }, { headers: { 'Authorization': `Bearer ${token}` } });

            if (isExamCorrect) {
                setIsFinalExamPassed(true);
                setShowCertificateModal(true);
                setQuizFeedback('Congratulations! You passed the final exam!');
                setIsQuizCompleted(true);
            } else {
                setQuizFeedback('You did not pass the final exam. Please review the course material and try again.');
                setIsQuizCompleted(true);
            }
        } catch (err) {
            console.error("Final exam submission failed:", err);
            setQuizFeedback('An error occurred during submission. Please try again.');
        }
    };

    const generateAndSaveCertificate = async () => {
        if (!certificateRef.current) return;
        
        const canvas = await html2canvas(certificateRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });
        canvas.toBlob((blob) => {
            saveAs(blob, `certificate-${course.title.replace(/\s+/g, '-')}-${user?.idNumber}.png`);
        });
    };

    const handleSlideSelect = useCallback((lessonIdx, slideIdx) => {
        setActiveLessonIndex(lessonIdx);
        setActiveSlideIndex(slideIdx);
        navigate(`/lesson/${courseId}/${course.lessons[lessonIdx]._id}?slide=${slideIdx}`, { replace: true });
        setIsQuizModalOpen(false); // Close quiz modal if open
    }, [courseId, navigate, course]);

    const toggleLessonAccordion = useCallback((lessonIdx) => {
        setOpenLessons(prev => ({ ...prev, [lessonIdx]: !prev[lessonIdx] }));
    }, []);

    const goToNextSlide = useCallback(() => {
        if (activeSlideIndex < activeLesson.slides.length - 1) {
            handleSlideSelect(activeLessonIndex, activeSlideIndex + 1);
        } else if (activeLessonIndex < course.lessons.length - 1) {
            handleSlideSelect(activeLessonIndex + 1, 0);
        }
    }, [activeSlideIndex, activeLesson, activeLessonIndex, course, handleSlideSelect]);

    const goToPreviousSlide = useCallback(() => {
        if (activeSlideIndex > 0) {
            handleSlideSelect(activeLessonIndex, activeSlideIndex - 1);
        } else if (activeLessonIndex > 0) {
            const prevLesson = course.lessons[activeLessonIndex - 1];
            handleSlideSelect(activeLessonIndex - 1, prevLesson.slides.length - 1);
        }
    }, [activeSlideIndex, activeLessonIndex, course, handleSlideSelect]);
    
    const handleCloseQuizModal = () => {
        setIsQuizModalOpen(false);
        setQuizFeedback('');
        setShowExplanation(false);
        setIsQuizCompleted(false);
        setSelectedAnswers({});
    };

    const getVideoElement = (element) => {
        if (element.content.includes("youtube.com") || element.content.includes("youtu.be")) {
            const videoId = element.content.split('/').pop().split('?')[0];
            return <iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube video player" className="w-full h-full object-cover"></iframe>;
        } else if (element.content.includes("vimeo.com")) {
            const videoId = element.content.split('/').pop();
            return <iframe src={`https://player.vimeo.com/video/${videoId}`} frameBorder="0" allow="fullscreen; picture-in-picture" allowFullScreen title="Vimeo video player" className="w-full h-full object-cover"></iframe>;
        } else {
            return <video src={element.content} controls className="w-full h-full object-cover" />;
        }
    };


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
                                                <div 
                                                    className="relative w-full aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden shadow-inner"
                                                    style={{ backgroundColor: activeSlide?.backgroundColor || undefined }} 
                                                >
                                                    {activeSlide?.elements.map((element, index) => {
                                                        const isText = element.type === 'text';

                                                        const style = {
                                                            position: 'absolute',
                                                            left: `${(element.position.x / 960) * 100}%`,
                                                            top: `${(element.position.y / 540) * 100}%`,
                                                            width: `${(element.size.width / 960) * 100}%`,
                                                            height: isText ? 'auto' : `${(element.size.height / 540) * 100}%`,
                                                            zIndex: element.zIndex || 1,
                                                            transform: `rotate(${element.rotation || 0}deg)`,
                                                            // Responsive font size utility classes
                                                            fontSize: isText ? '1rem' : undefined,
                                                        };
                                                        
                                                        const textStyles = isText ? {
                                                            fontSize: 'inherit',
                                                            color: element.color,
                                                            fontWeight: element.isBold ? 'bold' : 'normal',
                                                            fontStyle: element.isItalic ? 'italic' : 'normal',
                                                            width: '100%',
                                                            height: '100%',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                        } : {};

                                                        return (
                                                            <div key={index} style={style}>
                                                                {element.type === 'text' && (
                                                                    <div
                                                                        dangerouslySetInnerHTML={{ __html: element.content }}
                                                                        style={textStyles}
                                                                        className="text-xs md:text-sm lg:text-base"
                                                                    />
                                                                )}
                                                                {element.type === 'image' && <img src={element.content} alt="" className="w-full h-full object-cover" />}
                                                                {element.type === 'video' && getVideoElement(element)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {hasQuiz && !isQuizModalOpen && (
                                                    <div className="mt-4 text-center">
                                                        <button onClick={() => setIsQuizModalOpen(true)} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg">
                                                            Start Quiz
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {isQuizModalOpen && hasQuiz && (
                                                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-[90] flex items-center justify-center p-4">
                                                    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 relative">
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
                                                                                <select onChange={(e) => handleMatchingSelect(prompt._id, e.target.value)} value={selectedAnswers[prompt._id] || ''} disabled={isQuizCompleted} className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 w-48">
                                                                                    <option value="" disabled>--Select--</option>
                                                                                    {activeSlide.quiz.matchOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                                </select>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {quizFeedback &&
                                                                    <div className={`mt-6 p-3 rounded-lg text-white font-semibold flex items-center gap-2 max-w-lg mx-auto ${isQuizCompleted ? (isFinalExamPassed ? 'bg-green-500' : 'bg-red-500') : (isQuizCorrect ? 'bg-green-500' : 'bg-red-500')}`}>
                                                                        {isQuizCompleted ? (isFinalExamPassed ? <CheckCircleIcon /> : <XCircleIcon />) : (isQuizCorrect ? <CheckCircleIcon /> : <XCircleIcon />)}
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
                                                                        <button onClick={handleFinalExamSubmit} disabled={isFinalExamPassed || isQuizCompleted} className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition shadow-lg">Submit Final Exam</button>
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