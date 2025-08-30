import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Rnd } from 'react-rnd';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Trash2, X } from 'lucide-react';

// --- Icon Components ---
const EyeIcon = ({ SvgClass = "w-5 h-5", OnClick, IsVisible = true }) => (
    <svg onClick={OnClick} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`${SvgClass} ${IsVisible ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.443-7.24a1 1 0 011.13-.527h6.854a1 1 0 011.13-.527l4.443 7.24a1.012 1.012 0 010 .639l-4.443 7.24a1 1 0 01-1.13-.527H7.61a1 1 0 01-1.13-.527L2.036 12.322z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const EyeSlashIcon = (props) => (<EyeIcon {...props} IsVisible={false} />);

// --- Text Editor & Toolbar ---
const TextToolbar = ({ element, onUpdate, isActive }) => {
    if (!element || element.type !== 'text' || !isActive) return null;
    return (
        <div 
            className="absolute bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg flex items-center gap-3 z-30 border border-slate-300 dark:border-slate-600"
            style={{ top: `${element.position.y - 60}px`, left: `${element.position.x}px` }}
            onClick={e => e.stopPropagation()}
        >
            <input type="number" value={element.fontSize || 16} onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value, 10) })} className="w-16 p-1 rounded-lg bg-gray-100 dark:bg-slate-600 text-sm" title="Font Size" />
            <input type="color" value={element.color || '#000000'} onChange={(e) => onUpdate({ color: e.target.value })} className="w-8 h-8 p-0 border-none rounded-lg" title="Font Color" />
            <button onClick={() => onUpdate({ isBold: !element.isBold })} className={`px-2 py-1 text-sm rounded-lg ${element.isBold ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-600'}`}><b>B</b></button>
            <button onClick={() => onUpdate({ isItalic: !element.isItalic })} className={`px-2 py-1 text-sm rounded-lg ${element.isItalic ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-600'}`}><i>I</i></button>
        </div>
    );
};

const TextEditor = ({ element, onUpdate }) => {
    const textStyles = {
        fontSize: `${element.fontSize || 16}px`,
        color: element.color || '#000000',
        fontWeight: element.isBold ? 'bold' : 'normal',
        fontStyle: element.isItalic ? 'italic' : 'normal',
        width: '100%',
        height: '100%',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };
    return (
        <div
            contentEditable
            suppressContentEditableWarning
            style={textStyles}
            onBlur={(e) => onUpdate({ content: e.target.innerText })}
            dangerouslySetInnerHTML={{ __html: element.content }}
        />
    );
};

const CanvasElement = React.memo(({ element, index, isActive, onSelect, onUpdate, onDelete }) => {
    const nodeRef = useRef(null);
    const handleRotate = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const node = nodeRef.current?.resizableElement;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const onMouseMove = (moveEvent) => {
            const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
            onUpdate(index, { rotation: angle - 90 });
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    if (!element.isVisible) return null;
    const isText = element.type === 'text';
    const isMedia = element.type === 'image' || element.type === 'video';

    return (
        <Rnd
            ref={nodeRef}
            size={{ width: element.size.width, height: element.size.height }}
            position={element.position}
            onDragStop={(e, d) => onUpdate(index, { position: { x: d.x, y: d.y } })}
            onResizeStop={(e, direction, ref, delta, position) => {
                onUpdate(index, {
                    size: { width: parseInt(ref.style.width), height: parseInt(ref.style.height) },
                    position
                });
            }}
            onClick={(e) => { e.stopPropagation(); onSelect(index); }}
            className="group absolute"
            style={{
                zIndex: element.zIndex,
                transform: `rotate(${element.rotation || 0}deg)`,
                borderRadius: '10px',
                overflow: 'visible',
                backgroundColor: '#f9f9f9',
                border: `2px solid ${isActive ? '#3B82F6' : '#60A5FA'}`,
                padding: '4px',
                boxShadow: isActive ? '0 0 6px rgba(59,130,246,0.6)' : 'none',
                cursor: isMedia ? 'move' : 'default',
            }}
            dragHandleClassName={isText ? 'text-drag-handle' : undefined}
            disableResizing={isText}
            lockAspectRatio={element.type === 'video'}
        >
            <div className="relative w-full h-full rounded-xl flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300">
                {isMedia && !element.content && (
                    <div className="absolute opacity-20 pointer-events-none">
                        {element.type === 'image' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m0-8l-3 3m3-3l3 3m-3-3V4" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-4.243-2.442A1 1 0 009 9.618v4.764a1 1 0 001.509.858l4.243-2.442a1 1 0 000-1.716zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </div>
                )}
                {isMedia && !element.content && <span className="absolute text-gray-500 text-sm font-semibold pointer-events-none">{element.type === 'image' ? 'Photo' : 'Video'}</span>}
                {element.type === 'image' && element.content && <img src={element.content} alt="" className="w-full h-full object-cover rounded-xl" />}
                {element.type === 'video' && element.content && <video src={element.content} controls className="w-full h-full object-cover rounded-xl" />}
                {isText && <TextEditor element={element} onUpdate={(props) => onUpdate(index, props)} />}
            </div>
            {isActive && isMedia && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white rounded-lg shadow-md border border-gray-200 p-1 z-50">
                    <label className="flex flex-col items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition cursor-pointer" title="Upload File">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m0-8l-3 3m3-3l3 3m-3-3V4" /></svg>
                        <input type="file" accept={element.type === 'image' ? 'image/*' : 'video/*'} onChange={(e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => onUpdate(index, { content: reader.result }); reader.readAsDataURL(file); }} className="hidden" />
                        <span className="text-xs mt-1 text-gray-600">{element.type === 'image' ? 'Photo' : 'Video'}</span>
                    </label>
                    <button onClick={() => { const url = prompt("Enter media URL:"); if (url) onUpdate(index, { content: url }); }} className="flex flex-col items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition cursor-pointer" title="Enter URL">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4.243 4.243a4 4 0 01-5.656-5.656l1.415-1.414M6.343 6.343a4 4 0 015.656 0l4.243 4.243a4 4 0 01-5.656 5.656l-1.414-1.415" /></svg>
                        <span className="text-xs mt-1 text-gray-600">URL</span>
                    </button>
                </div>
            )}
            {isActive && (
                <>
                    {isText && <div className="text-drag-handle absolute -top-5 -left-5 bg-blue-500 text-white rounded-full w-6 h-6 cursor-move flex items-center justify-center text-xs z-20 shadow">✥</div>}
                    <button onClick={() => onDelete(index)} className="absolute -top-5 -right-5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-20 shadow">X</button>
                    <div onMouseDown={handleRotate} className="absolute -bottom-5 -right-5 bg-blue-500 text-white rounded-full w-6 h-6 cursor-pointer flex items-center justify-center z-20 shadow">↻</div>
                </>
            )}
        </Rnd>
    );
});

const QuizEditor = ({ quizData, onUpdate, slideIndex }) => {
    const [localQuiz, setLocalQuiz] = useState(quizData);
    useEffect(() => { setLocalQuiz(quizData); }, [quizData]);
    const handleBlur = () => { onUpdate(localQuiz); };
    const handleQuizTypeChange = (e) => {
        const newType = e.target.value;
        const newQuizState = { ...localQuiz, type: newType };
        if (newType === 'matching' && (!newQuizState.matchPrompts || newQuizState.matchPrompts.length === 0)) {
            newQuizState.matchPrompts = [{ prompt: 'Label 1', correctMatch: 'A' }];
            newQuizState.matchOptions = ['A', 'B'];
        }
        setLocalQuiz(newQuizState);
        onUpdate(newQuizState);
    };
    const handleInputChange = (field, value) => setLocalQuiz(prev => ({ ...prev, [field]: value }));
    const handleAnswerChange = (idx, field, value) => {
        const newAnswers = [...localQuiz.answers];
        if (field === 'isCorrect' && localQuiz.type === 'single-choice') {
            newAnswers.forEach((ans, i) => ans.isCorrect = i === idx);
        } else { newAnswers[idx][field] = value; }
        setLocalQuiz(prev => ({ ...prev, answers: newAnswers }));
        if (field === 'isCorrect') onUpdate({ ...localQuiz, answers: newAnswers });
    };
    const addAnswer = () => {
        const newAnswers = [...localQuiz.answers, { text: 'New Answer', isCorrect: false }];
        setLocalQuiz(prev => ({ ...prev, answers: newAnswers }));
        onUpdate({ ...localQuiz, answers: newAnswers });
    };
    const deleteAnswer = (idx) => {
        const newAnswers = localQuiz.answers.filter((_, i) => i !== idx);
        setLocalQuiz(prev => ({ ...prev, answers: newAnswers }));
        onUpdate({ ...localQuiz, answers: newAnswers });
    };
    const handleNestedChange = (field, idx, nestedField, value) => {
        const newArray = [...localQuiz[field]];
        if (nestedField) { newArray[idx][nestedField] = value; } else { newArray[idx] = value; }
        setLocalQuiz(prev => ({ ...prev, [field]: newArray }));
    };
    const addNested = (field) => {
        const newArray = [...localQuiz[field]];
        if (field === 'matchPrompts') newArray.push({ prompt: 'New Label', correctMatch: 'A' });
        if (field === 'matchOptions') newArray.push('New Option');
        setLocalQuiz(prev => ({ ...prev, [field]: newArray }));
        onUpdate({ ...localQuiz, [field]: newArray });
    };
    const deleteNested = (field, idx) => {
        const newArray = localQuiz[field].filter((_, i) => i !== idx);
        setLocalQuiz(prev => ({ ...prev, [field]: newArray }));
        onUpdate({ ...localQuiz, [field]: newArray });
    };
    return (
        <>
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-slate-300 dark:border-slate-600">
                <h3 className="text-xl font-bold">Quiz Editor</h3>
                <select value={localQuiz.type} onChange={handleQuizTypeChange} className="p-2 border rounded bg-white dark:bg-slate-700">
                    <option value="single-choice">Single Choice</option>
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="matching">Matching</option>
                </select>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Question</label>
                    <textarea value={localQuiz.question} onChange={(e) => handleInputChange('question', e.target.value)} onBlur={handleBlur} className="w-full p-2 mt-1 border rounded bg-gray-50 dark:bg-slate-700" />
                </div>
                {(localQuiz.type === 'single-choice' || localQuiz.type === 'multiple-choice') && (
                    <div>
                        <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Answers</label>
                        {localQuiz.answers.map((ans, idx) => (
                            <div key={idx} className="flex items-center gap-3 mt-2">
                                <input type={localQuiz.type === 'single-choice' ? 'radio' : 'checkbox'} name={`correctAnswer-${slideIndex}`} checked={ans.isCorrect} onChange={(e) => handleAnswerChange(idx, 'isCorrect', e.target.checked)} className="h-5 w-5" />
                                <input type="text" value={ans.text} onChange={(e) => handleAnswerChange(idx, 'text', e.target.value)} onBlur={handleBlur} className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700" />
                                <button onClick={() => deleteAnswer(idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
                            </div>
                        ))}
                        <button onClick={addAnswer} className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Add Answer</button>
                    </div>
                )}
                {localQuiz.type === 'matching' && (
                    <>
                        <div>
                            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Prompts & Correct Matches</label>
                            {localQuiz.matchPrompts.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-2 mt-2">
                                    <input type="text" value={p.prompt} onChange={e => handleNestedChange('matchPrompts', idx, 'prompt', e.target.value)} onBlur={handleBlur} className="w-2/3 p-2 border rounded bg-gray-50 dark:bg-slate-700" placeholder="Prompt (e.g., Lateral Wall)" />
                                    <input type="text" value={p.correctMatch} onChange={e => handleNestedChange('matchPrompts', idx, 'correctMatch', e.target.value)} onBlur={handleBlur} className="w-1/3 p-2 border rounded bg-gray-50 dark:bg-slate-700" placeholder="Correct Match (e.g., A)" />
                                    <button onClick={() => deleteNested('matchPrompts', idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
                                </div>
                            ))}
                            <button onClick={() => addNested('matchPrompts')} className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Add Prompt</button>
                        </div>
                        <div>
                            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Match Options</label>
                            {localQuiz.matchOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2 mt-2">
                                    <input type="text" value={opt} onChange={e => handleNestedChange('matchOptions', idx, null, e.target.value)} onBlur={handleBlur} className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700" placeholder="Option (e.g., A)" />
                                    <button onClick={() => deleteNested('matchOptions', idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
                                </div>
                            ))}
                            <button onClick={() => addNested('matchOptions')} className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Add Option</button>
                        </div>
                    </>
                )}
                <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Explanation</label>
                    <textarea value={localQuiz.explanation} onChange={(e) => handleInputChange('explanation', e.target.value)} onBlur={handleBlur} className="w-full p-2 mt-1 border rounded bg-gray-50 dark:bg-slate-700" />
                </div>
            </div>
        </>
    );
};

const LayersPanel = ({ elements = [] }) => {
    return (
        <>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Layers</h2>
            {elements.length > 0 ? (
                <ul className="space-y-2">
                    {[...elements].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1)).map((element, i) => {
                        const originalIndex = elements.findIndex(el => el === element);
                        return (
                            <li key={originalIndex} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-700 rounded">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-2">{`Layer ${originalIndex + 1}: ${element.type}`}</span>
                            </li>
                        );
                    })}
                </ul>
            ) : (<p className="text-sm text-gray-500 dark:text-gray-400">No elements on this slide.</p>)}
        </>
    );
};

const AdminCourseEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeLessonIndex, setActiveLessonIndex] = useState(null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(null);
    const [activeElementIndex, setActiveElementIndex] = useState(null);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        const fetchCourse = async () => {
            if (id) {
                try {
                    const { data } = await axios.get(`/api/courses/${id}`);
                    setCourse(data);
                    if (data.lessons?.length > 0) {
                        setActiveLessonIndex(0);
                        if (data.lessons[0].slides?.length > 0) setActiveSlideIndex(0);
                    }
                } catch (error) { console.error("Failed to fetch course", error); }
                finally { setLoading(false); }
            } else {
                setCourse({
                    title: 'New Course',
                    description: '',
                    level: 'Beginner',
                    specialty: 'General',
                    price: 0,
                    imageUrl: '',
                    lessons: [],
                    tags: []
                });
                setLoading(false);
            }
        };
        fetchCourse();
    }, [id]);

    const updateCourse = useCallback((updater) => {
        setCourse(currentCourse => {
            const newCourse = JSON.parse(JSON.stringify(currentCourse));
            updater(newCourse);
            return newCourse;
        });
    }, []);
    
    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && course.tags && !course.tags.includes(newTag)) {
                updateCourse(draft => {
                    draft.tags.push(newTag);
                });
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        updateCourse(draft => {
            draft.tags = draft.tags.filter(tag => tag !== tagToRemove);
        });
    };

    const handleQuizUpdate = (updatedQuizData) => {
        updateCourse(draft => {
            draft.lessons[activeLessonIndex].slides[activeSlideIndex].quiz = updatedQuizData;
        });
    };

    const handleSaveCourse = async () => {
        if (!course.title || !course.description || !course.level || !course.specialty) {
            alert('Please fill out all required course details (Title, Description, Level, and Specialty) before saving.');
            return;
        }
        
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            if (id === 'new') {
                 const { data } = await axios.post('/api/courses', course, config);
                 navigate(`/admin/course/${data._id}`);
            } else {
                await axios.put(`/api/courses/${id}`, course, config);
            }
            alert('Course saved successfully!');
            navigate('/admin');
        } catch (error) {
            console.error('Failed to save course', error);
            alert('Error saving course.');
        }
    };

    const handleAddLesson = () => {
        const newLesson = { title: `New Lesson ${course.lessons.length + 1}`, slides: [] };
        updateCourse(draft => {
            draft.lessons.push(newLesson);
            setActiveLessonIndex(draft.lessons.length - 1);
            setActiveSlideIndex(null);
        });
    };
    
    const handleAddFinalExamLesson = () => {
        const newFinalExamLesson = { title: 'Final Exam', slides: [{ elements: [], quiz: { type: 'single-choice', question: 'Final Exam Question', answers: [], explanation: '' } }], isFinalExam: true };
        updateCourse(draft => {
            draft.lessons = draft.lessons.filter(l => !l.isFinalExam);
            draft.lessons.push(newFinalExamLesson);
            setActiveLessonIndex(draft.lessons.length - 1);
            setActiveSlideIndex(0);
        });
    };

    const handleDeleteLesson = (lessonIndexToDelete) => {
        updateCourse(draft => {
            draft.lessons.splice(lessonIndexToDelete, 1);
            if (draft.lessons.length === 0) {
                setActiveLessonIndex(null);
                setActiveSlideIndex(null);
            } else if (activeLessonIndex >= lessonIndexToDelete) {
                const newActiveLessonIndex = Math.max(0, activeLessonIndex - 1);
                setActiveLessonIndex(newActiveLessonIndex);
                setActiveSlideIndex(draft.lessons[newActiveLessonIndex]?.slides.length > 0 ? 0 : null);
            }
        });
    };
    
    const handleAddSlide = () => {
        if (activeLessonIndex === null) return;
        
        // FIX: The default slide elements are updated to include a placeholder URL that bypasses the backend's 'required' field validation.
        const defaultElements = [
            { type: 'text', content: 'Title', position: { x: 40, y: 30 }, size: { width: 880, height: 60 }, rotation: 0, zIndex: 1, isVisible: true, fontSize: 32, color: '#000000', isBold: true, isItalic: false },
            { type: 'text', content: 'New Text', position: { x: 40, y: 110 }, size: { width: 440, height: 260 }, rotation: 0, zIndex: 2, isVisible: true, fontSize: 16, color: '#000000', isBold: false, isItalic: false },
            { type: 'image', content: 'https://placehold.co/440x260/e2e8f0/94a3b8?text=Image', position: { x: 500, y: 110 }, size: { width: 440, height: 180 }, rotation: 0, zIndex: 3, isVisible: true },
            { type: 'video', content: 'https://www.w3schools.com/html/mov_bbb.mp4', position: { x: 500, y: 310 }, size: { width: 440, height: 180 }, rotation: 0, zIndex: 4, isVisible: true }
        ];

        const newSlide = { 
            title: `Slide ${course.lessons[activeLessonIndex].slides.length + 1}`,
            elements: defaultElements,
            backgroundColor: '#FFFFFF',
            quiz: null,
        };
        
        updateCourse(draft => {
            if (draft.lessons[activeLessonIndex]) {
                draft.lessons[activeLessonIndex].slides.push(newSlide);
                setActiveSlideIndex(draft.lessons[activeLessonIndex].slides.length - 1);
            }
        });
    };
    
    const handleDeleteSlide = (slideIndexToDelete) => {
        updateCourse(draft => {
            const slides = draft.lessons[activeLessonIndex]?.slides;
            if (slides) {
                slides.splice(slideIndexToDelete, 1);
                if (slides.length === 0) {
                    setActiveSlideIndex(null);
                } else if (activeSlideIndex >= slideIndexToDelete) {
                    setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
                }
            }
        });
    };

    const handleUpdateSlideTitle = (index, newTitle) => {
        updateCourse(draft => {
            if (draft.lessons[activeLessonIndex]?.slides[index]) {
                draft.lessons[activeLessonIndex].slides[index].title = newTitle;
            }
        });
    };

    const handleAddElement = (type) => {
        if (activeLessonIndex === null || activeSlideIndex === null) return;
        updateCourse(draft => {
            const activeSlide = draft.lessons[activeLessonIndex]?.slides[activeSlideIndex];
            if (activeSlide) {
                const newElement = {
                    type,
                    position: { x: 50, y: 50 },
                    size: { width: type === 'text' ? 250 : 320, height: type === 'text' ? 100 : 180 },
                    rotation: 0,
                    zIndex: (activeSlide.elements?.length || 0) + 1,
                    isVisible: true,
                    content: type === 'text' ? 'New Text' : '',
                    fontSize: 16,
                    color: '#000000',
                    isBold: false,
                    isItalic: false,
                };
                activeSlide.elements.push(newElement);
            }
        });
    };

    const handleUpdateElement = useCallback((elementIndex, newProps) => {
        updateCourse(draft => {
            const element = draft.lessons[activeLessonIndex]?.slides[activeSlideIndex]?.elements[elementIndex];
            if (element) {
                Object.assign(element, newProps);
            }
        });
    }, [activeLessonIndex, activeSlideIndex, updateCourse]);

    const handleDeleteElement = useCallback((elementIndex) => {
        setActiveElementIndex(null);
        updateCourse(draft => {
            draft.lessons[activeLessonIndex]?.slides[activeSlideIndex]?.elements.splice(elementIndex, 1);
        });
    }, [activeLessonIndex, activeSlideIndex, updateCourse]);
    
    const onDragEnd = (result) => {
        const { source, destination, type } = result;
        if (!destination) return;
        if (type === 'lessons') {
            updateCourse(draft => {
                const [reorderedItem] = draft.lessons.splice(source.index, 1);
                draft.lessons.splice(destination.index, 0, reorderedItem);
                setActiveLessonIndex(destination.index);
            });
        } else if (type === 'slides') {
            updateCourse(draft => {
                const lesson = draft.lessons[activeLessonIndex];
                if (lesson) {
                    const [reorderedItem] = lesson.slides.splice(source.index, 1);
                    lesson.slides.splice(destination.index, 0, reorderedItem);
                    setActiveSlideIndex(destination.index);
                }
            });
        }
    };
    
    const toggleQuizOnSlide = () => {
        updateCourse(draft => {
            const slide = draft.lessons[activeLessonIndex]?.slides[activeSlideIndex];
            if (slide) {
                if (slide.quiz) {
                    slide.quiz = null;
                } else {
                    slide.quiz = {
                        type: 'single-choice',
                        question: 'New Question',
                        answers: [{ text: 'Correct Answer', isCorrect: true }, { text: 'Incorrect Answer', isCorrect: false }],
                        explanation: 'Add an explanation.',
                        matchPrompts: [],
                        matchOptions: []
                    };
                }
            }
        });
    };

    const handleCourseImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateCourse(draft => {
                draft.imageUrl = reader.result;
            });
        };
        reader.readAsDataURL(file);
    };

    const handleFinalExamUpdate = (updatedQuizData) => {
        updateCourse(draft => {
            const finalExamLesson = draft.lessons.find(l => l.isFinalExam);
            if (finalExamLesson && finalExamLesson.slides[0]?.quiz) {
                Object.assign(finalExamLesson.slides[0].quiz, updatedQuizData);
            }
        });
    };

    if (loading) return <div className="text-center py-10">Loading Editor...</div>;
    if (!course) return <div className="text-center py-10">Course data could not be loaded.</div>;

    const activeLesson = activeLessonIndex !== null ? course.lessons[activeLessonIndex] : null;
    const activeSlide = activeLesson && activeSlideIndex !== null ? activeLesson.slides[activeSlideIndex] : null;
    const activeElement = activeSlide && activeElementIndex !== null ? activeSlide.elements[activeElementIndex] : null;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="container mx-auto px-6 py-12">
                <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Course Editor</h1>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md mb-8">
                    <input name="title" value={course.title || ''} onChange={(e) => updateCourse(draft => { draft.title = e.target.value; })} placeholder="Course Title" className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white mb-4" />
                    <textarea name="description" value={course.description || ''} onChange={(e) => updateCourse(draft => { draft.description = e.target.value; })} placeholder="Description" className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white mb-4"></textarea>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Level</label>
                        <select 
                            name="level" 
                            value={course.level || ''} 
                            onChange={(e) => updateCourse(draft => { draft.level = e.target.value; })}
                            className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white"
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Specialty</label>
                           <select 
                            name="specialty" 
                            value={course.specialty || ''} 
                            onChange={(e) => updateCourse(draft => { draft.specialty = e.target.value; })}
                            className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white"
                        >
                            <option value="General">General</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Emergency Medicine">Emergency Medicine</option>
                            <option value="Anesthesiology">Anesthesiology</option>
                            <option value="Critical Care">Critical Care</option>
                        </select>
                    </div>

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Price</label>
                    <div className="relative mb-4">
                        <span className="absolute left-3 inset-y-0 flex items-center text-gray-500 dark:text-gray-400">$</span>
                        <input type="number" name="price" value={course.price || 0} onChange={(e) => updateCourse(draft => { draft.price = parseFloat(e.target.value) || 0; })} placeholder="Price" className="w-full p-2 pl-8 border rounded text-gray-900 dark:bg-slate-700 dark:text-white" />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                        <div className="flex flex-wrap items-center gap-2 p-2 border rounded bg-gray-50 dark:bg-slate-700">
                            {course.tags?.map(tag => (
                                <div key={tag} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-semibold px-3 py-1 rounded-full">
                                    {tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-500">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <input 
                                type="text" 
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder="Add a tag and press Enter..."
                                className="flex-grow bg-transparent focus:outline-none text-sm p-1"
                            />
                        </div>
                    </div>
                    
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-4">Instructor's Welcome Note (Optional)</label>
                    <textarea name="instructorWelcomeNote" value={course.instructorWelcomeNote || ''} onChange={(e) => updateCourse(draft => { draft.instructorWelcomeNote = e.target.value; })} placeholder="A short, personal welcome message for students of this course..." className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white mb-4 h-24"></textarea>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Image</label>
                        <div className="flex items-center gap-4">
                            <img src={course.imageUrl} alt="Course preview" className="w-48 h-24 object-cover rounded-md bg-slate-200 dark:bg-slate-700"/>
                            <input type="file" accept="image/*" onChange={handleCourseImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        </div>
                    </div>
                    <button onClick={handleSaveCourse} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Save Course Changes</button>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-3">
                           <div className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto space-y-6 pr-2">
                                <Droppable droppableId="lessons" type="lessons">
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                                            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Lessons</h2>
                                            <button onClick={handleAddLesson} className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 mb-2">Add Lesson</button>
                                            <button onClick={handleAddFinalExamLesson} className="w-full bg-purple-500 text-white py-2 rounded-md hover:bg-purple-600 mb-2">Add Final Exam Lesson</button>
                                            {course.lessons.map((lesson, index) => (
                                                <Draggable key={`lesson-${index}`} draggableId={`lesson-${index}`} index={index}>
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`p-2 my-1 rounded flex items-center ${activeLessonIndex === index ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                                                            <div className="flex-grow cursor-pointer" onClick={() => { setActiveLessonIndex(index); setActiveSlideIndex(course.lessons[index]?.slides.length > 0 ? 0 : null); }}>
                                                                <input type="text" value={lesson.title || ''} onChange={(e) => updateCourse(draft => { draft.lessons[index].title = e.target.value; })} className="font-semibold bg-transparent w-full text-gray-800 dark:text-white" />
                                                            </div>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(index); }} title="Delete Lesson" className="ml-2 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/50 transition-colors">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                                {activeLesson && (
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                                        <Droppable droppableId="slides" type="slides">
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                                    <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Slides</h2>
                                                    <button onClick={handleAddSlide} className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 mb-2">Add Slide</button>
                                                    {activeLesson?.slides.map((slide, index) => (
                                                        <Draggable key={`slide-${index}`} draggableId={`slide-${index}`} index={index}>
                                                            {(provided) => (
                                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`p-3 my-1 rounded flex items-center justify-between cursor-pointer ${activeSlideIndex === index ? 'bg-indigo-200 dark:bg-indigo-800' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                                                                    <span className="flex-grow text-left" onClick={() => setActiveSlideIndex(index)}>
                                                                        <input
                                                                            type="text"
                                                                            value={slide.title || ''}
                                                                            onChange={(e) => updateCourse(draft => {
                                                                                draft.lessons[activeLessonIndex].slides[index].title = e.target.value;
                                                                            })}
                                                                            className="bg-transparent w-full font-medium text-gray-800 dark:text-gray-200 focus:outline-none"
                                                                        />
                                                                    </span>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(index); }} title="Delete Slide" className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/50 transition-colors">
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                )}
                            </div>
                    </div>
                    
                    <div className="col-span-9">
                        <div className="sticky top-24">
                             <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                                 <div className="flex items-center justify-between mb-4">
                                     <div>
                                         <button onClick={() => handleAddElement('text')} className="bg-gray-700 text-white px-3 py-1 rounded-md mr-2 text-sm">Add Text</button>
                                         <button onClick={() => handleAddElement('image')} className="bg-gray-700 text-white px-3 py-1 rounded-md mr-2 text-sm">Add Image</button>
                                         <button onClick={() => handleAddElement('video')} className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm">Add Video</button>
                                     </div>
                                     {activeSlide &&
                                         <div className="flex items-center gap-4">
                                             <button onClick={toggleQuizOnSlide} className="text-sm bg-purple-500 text-white px-3 py-1 rounded-md hover:bg-purple-600">
                                                 {activeSlide.quiz ? 'Remove Quiz' : 'Add Quiz to Slide'}
                                             </button>
                                             <div className="flex items-center gap-2">
                                                 <label htmlFor="bgColor" className="text-sm font-medium">BG Color:</label>
                                                 <input id="bgColor" type="color" value={activeSlide.backgroundColor || '#FFFFFF'} onChange={(e) => updateCourse(d => { d.lessons[activeLessonIndex].slides[activeSlideIndex].backgroundColor = e.target.value; })} className="w-8 h-8 p-0 border-none rounded" />
                                             </div>
                                         </div>
                                     }
                                 </div>
                                 <div className="relative w-full aspect-video rounded-md overflow-hidden shadow-inner" style={{ backgroundColor: activeSlide?.backgroundColor || '#FFFFFF' }} onClick={() => setActiveElementIndex(null)}>
                                     <TextToolbar 
                                         isActive={activeElementIndex !== null}
                                         element={activeElement} 
                                         onUpdate={(props) => handleUpdateElement(activeElementIndex, props)}
                                     />
                                     {activeSlide?.elements.map((element, index) => (
                                         <CanvasElement
                                             key={index}
                                             element={element}
                                             index={index}
                                             isActive={activeElementIndex === index}
                                             onSelect={setActiveElementIndex}
                                             onUpdate={handleUpdateElement}
                                             onDelete={handleDeleteElement}
                                         />
                                     ))}
                                 </div>
                                 {activeSlide?.quiz && (
                                     <div className="mt-6">
                                         <QuizEditor
                                             quizData={activeSlide.quiz}
                                             onUpdate={handleQuizUpdate}
                                             slideIndex={activeSlideIndex}
                                         />
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </DragDropContext>
    );
};

export default AdminCourseEditor;