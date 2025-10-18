import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Rnd } from "react-rnd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Trash2, X } from "lucide-react";

// --- Simple text tools (same as before) ---
const TextToolbar = ({ element, onUpdate, isActive }) => {
  if (!element || element.type !== "text" || !isActive) return null;
  return (
    <div
      className="absolute bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg flex items-center gap-3 z-30 border border-slate-300 dark:border-slate-600"
      style={{ top: `${element.position.y - 60}px`, left: `${element.position.x}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        value={element.fontSize || 16}
        onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value, 10) || 16 })}
        className="w-16 p-1 rounded-lg bg-gray-100 dark:bg-slate-600 text-sm"
        title="Font Size"
      />
      <input
        type="color"
        value={element.color || "#000000"}
        onChange={(e) => onUpdate({ color: e.target.value })}
        className="w-8 h-8 p-0 border-none rounded-lg"
        title="Font Color"
      />
      <button
        onClick={() => onUpdate({ isBold: !element.isBold })}
        className={`px-2 py-1 text-sm rounded-lg ${
          element.isBold ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-slate-600"
        }`}
      >
        <b>B</b>
      </button>
      <button
        onClick={() => onUpdate({ isItalic: !element.isItalic })}
        className={`px-2 py-1 text-sm rounded-lg ${
          element.isItalic ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-slate-600"
        }`}
      >
        <i>I</i>
      </button>
    </div>
  );
};

const TextEditor = ({ element, onUpdate }) => {
  const textStyles = {
    fontSize: `${element.fontSize || 16}px`,
    color: element.color || "#000000",
    fontWeight: element.isBold ? "bold" : "normal",
    fontStyle: element.isItalic ? "italic" : "normal",
    width: "100%",
    height: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
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
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const onMouseMove = (me) => {
      const angle = (Math.atan2(me.clientY - cy, me.clientX - cx) * 180) / Math.PI;
      onUpdate(index, { rotation: angle - 90 });
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (element.isVisible === false) return null;
  const isText = element.type === "text";
  const isMedia = element.type === "image" || element.type === "video";

  return (
    <Rnd
      ref={nodeRef}
      size={{ width: element.size.width, height: element.size.height }}
      position={element.position}
      onDragStop={(e, d) => onUpdate(index, { position: { x: d.x, y: d.y } })}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate(index, {
          size: { width: parseInt(ref.style.width), height: parseInt(ref.style.height) },
          position,
        });
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index);
      }}
      className="group absolute"
      style={{
        zIndex: element.zIndex,
        transform: `rotate(${element.rotation || 0}deg)`,
        borderRadius: "10px",
        overflow: "visible",
        backgroundColor: "#f9f9f9",
        border: `2px solid ${isActive ? "#3B82F6" : "#60A5FA"}`,
        padding: "4px",
        boxShadow: isActive ? "0 0 6px rgba(59,130,246,0.6)" : "none",
        cursor: isMedia ? "move" : "default",
      }}
      dragHandleClassName={isText ? "text-drag-handle" : undefined}
      disableResizing={isText}
      lockAspectRatio={element.type === "video"}
    >
      <div className="relative w-full h-full rounded-xl flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300">
        {isMedia && !element.content && (
          <span className="absolute text-gray-500 text-sm font-semibold pointer-events-none">
            {element.type === "image" ? "Photo" : "Video"}
          </span>
        )}

        {element.type === "image" && element.content && (
          <img src={element.content} alt="" className="w-full h-full object-cover rounded-xl" />
        )}
        {element.type === "video" && element.content && (
          <video src={element.content} controls className="w-full h-full object-cover rounded-xl" />
        )}
        {isText && <TextEditor element={element} onUpdate={(props) => onUpdate(index, props)} />}
      </div>

      {isActive && isMedia && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white rounded-lg shadow-md border border-gray-200 p-1 z-50">
          <label className="flex flex-col items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition cursor-pointer" title="Upload File">
            <input
              type="file"
              accept={element.type === "image" ? "image/*" : "video/*"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onUpdate(index, { content: reader.result });
                reader.readAsDataURL(file);
              }}
              className="hidden"
            />
            <span className="text-xs mt-1 text-gray-600">{element.type === "image" ? "Photo" : "Video"}</span>
          </label>

          <button
            onClick={() => {
              const url = prompt("Enter media URL:");
              if (url) onUpdate(index, { content: url });
            }}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition cursor-pointer"
            title="Enter URL"
          >
            <span className="text-xs mt-1 text-gray-600">URL</span>
          </button>
        </div>
      )}

      {isActive && (
        <>
          {isText && (
            <div className="text-drag-handle absolute -top-5 -left-5 bg-blue-500 text-white rounded-full w-6 h-6 cursor-move flex items-center justify-center text-xs z-20 shadow">
              ✥
            </div>
          )}
          <button
            onClick={() => onDelete(index)}
            className="absolute -top-5 -right-5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-20 shadow"
          >
            X
          </button>
          <div
            onMouseDown={handleRotate}
            className="absolute -bottom-5 -right-5 bg-blue-500 text-white rounded-full w-6 h-6 cursor-pointer flex items-center justify-center z-20 shadow"
          >
            ↻
          </div>
        </>
      )}
    </Rnd>
  );
});

const QuizEditor = ({ quizData, onUpdate, slideIndex }) => {
  const [localQuiz, setLocalQuiz] = useState(quizData);
  useEffect(() => setLocalQuiz(quizData), [quizData]);

  const handleBlur = () => onUpdate(localQuiz);
  const handleQuizTypeChange = (e) => {
    const newType = e.target.value;
    const newQuiz = { ...localQuiz, type: newType };
    if (newType === "matching" && (!newQuiz.matchPrompts || newQuiz.matchPrompts.length === 0)) {
      newQuiz.matchPrompts = [{ prompt: "Label 1", correctMatch: "A" }];
      newQuiz.matchOptions = ["A", "B"];
    }
    setLocalQuiz(newQuiz);
    onUpdate(newQuiz);
  };

  const handleInputChange = (field, value) => setLocalQuiz((p) => ({ ...p, [field]: value }));
  const handleAnswerChange = (idx, field, value) => {
    const answers = [...localQuiz.answers];
    if (field === "isCorrect" && localQuiz.type === "single-choice") {
      answers.forEach((a, i) => (a.isCorrect = i === idx));
    } else {
      answers[idx][field] = value;
    }
    setLocalQuiz((p) => ({ ...p, answers }));
    onUpdate({ ...localQuiz, answers });
  };
  const addAnswer = () => {
    const answers = [...localQuiz.answers, { text: "New Answer", isCorrect: false }];
    setLocalQuiz((p) => ({ ...p, answers }));
    onUpdate({ ...localQuiz, answers });
  };
  const deleteAnswer = (idx) => {
    const answers = localQuiz.answers.filter((_, i) => i !== idx);
    setLocalQuiz((p) => ({ ...p, answers }));
    onUpdate({ ...localQuiz, answers });
  };

  const handleNested = (field, idx, nestedField, value) => {
    const arr = [...localQuiz[field]];
    if (nestedField) arr[idx][nestedField] = value;
    else arr[idx] = value;
    setLocalQuiz((p) => ({ ...p, [field]: arr }));
  };
  const addNested = (field) => {
    const arr = [...localQuiz[field]];
    if (field === "matchPrompts") arr.push({ prompt: "New Label", correctMatch: "A" });
    if (field === "matchOptions") arr.push("New Option");
    setLocalQuiz((p) => ({ ...p, [field]: arr }));
    onUpdate({ ...localQuiz, [field]: arr });
  };
  const delNested = (field, idx) => {
    const arr = localQuiz[field].filter((_, i) => i !== idx);
    setLocalQuiz((p) => ({ ...p, [field]: arr }));
    onUpdate({ ...localQuiz, [field]: arr });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 border-b pb-2 border-slate-300 dark:border-slate-600">
        <h3 className="text-xl font-bold">Quiz Editor</h3>
        <select
          value={localQuiz.type}
          onChange={handleQuizTypeChange}
          className="p-2 border rounded bg-white dark:bg-slate-700"
        >
          <option value="single-choice">Single Choice</option>
          <option value="multiple-choice">Multiple Choice</option>
          <option value="matching">Matching</option>
        </select>
      </div>

      <div className="space-y-4">
        <div>
          <label className="font-semibold block mb-1">Question</label>
          <textarea
            value={localQuiz.question}
            onChange={(e) => handleInputChange("question", e.target.value)}
            onBlur={handleBlur}
            className="w-full p-2 mt-1 border rounded bg-gray-50 dark:bg-slate-700"
          />
        </div>

        {(localQuiz.type === "single-choice" || localQuiz.type === "multiple-choice") && (
          <div>
            <label className="font-semibold block mb-1">Answers</label>
            {localQuiz.answers.map((ans, idx) => (
              <div key={idx} className="flex items-center gap-3 mt-2">
                <input
                  type={localQuiz.type === "single-choice" ? "radio" : "checkbox"}
                  name={`correct-${slideIndex}`}
                  checked={ans.isCorrect}
                  onChange={(e) => handleAnswerChange(idx, "isCorrect", e.target.checked)}
                  className="h-5 w-5"
                />
                <input
                  type="text"
                  value={ans.text}
                  onChange={(e) => handleAnswerChange(idx, "text", e.target.value)}
                  onBlur={handleBlur}
                  className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700"
                />
                <button onClick={() => deleteAnswer(idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">
                  ×
                </button>
              </div>
            ))}
            <button onClick={addAnswer} className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md">
              Add Answer
            </button>
          </div>
        )}

        {localQuiz.type === "matching" && (
          <>
            <div>
              <label className="font-semibold block mb-1">Prompts & Correct Matches</label>
              {localQuiz.matchPrompts.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={p.prompt}
                    onChange={(e) => handleNested("matchPrompts", idx, "prompt", e.target.value)}
                    onBlur={handleBlur}
                    className="w-2/3 p-2 border rounded bg-gray-50 dark:bg-slate-700"
                    placeholder="Prompt"
                  />
                  <input
                    type="text"
                    value={p.correctMatch}
                    onChange={(e) => handleNested("matchPrompts", idx, "correctMatch", e.target.value)}
                    onBlur={handleBlur}
                    className="w-1/3 p-2 border rounded bg-gray-50 dark:bg-slate-700"
                    placeholder="Correct Match"
                  />
                  <button onClick={() => delNested("matchPrompts", idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">
                    ×
                  </button>
                </div>
              ))}
              <button onClick={() => addNested("matchPrompts")} className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md">
                Add Prompt
              </button>
            </div>

            <div>
              <label className="font-semibold block mb-1">Match Options</label>
              {localQuiz.matchOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleNested("matchOptions", idx, null, e.target.value)}
                    onBlur={handleBlur}
                    className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700"
                    placeholder="Option"
                  />
                  <button onClick={() => delNested("matchOptions", idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">
                    ×
                  </button>
                </div>
              ))}
              <button onClick={() => addNested("matchOptions")} className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md">
                Add Option
              </button>
            </div>
          </>
        )}

        <div>
          <label className="font-semibold block mb-1">Explanation</label>
          <textarea
            value={localQuiz.explanation}
            onChange={(e) => handleInputChange("explanation", e.target.value)}
            onBlur={handleBlur}
            className="w-full p-2 mt-1 border rounded bg-gray-50 dark:bg-slate-700"
          />
        </div>
      </div>
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

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      try {
        const { data } = await axios.get(`/api/courses/${id}`);
        setCourse(data);
        if (data.lessons?.length > 0) {
          setActiveLessonIndex(0);
          if (data.lessons[0].slides?.length > 0) setActiveSlideIndex(0);
        }
      } catch (e) {
        console.error("Failed to fetch course", e);
      } finally {
        setLoading(false);
      }
    };
    if (id === "new") {
      setCourse({
        title: "New Course",
        description: "",
        level: "Beginner",
        specialty: "General",
        price: 0,
        imageUrl: "",
        lessons: [],
        tags: [],
      });
      setLoading(false);
    } else {
      fetchCourse();
    }
  }, [id]);

  const updateCourse = useCallback((updater) => {
    setCourse((cur) => {
      const draft = JSON.parse(JSON.stringify(cur || {}));
      updater(draft);
      return draft;
    });
  }, []);

  const handleSaveCourse = async () => {
    if (!course.title || !course.description || !course.level || !course.specialty) {
      alert("Please fill required fields.");
      return;
    }
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (id === "new") {
        const { data } = await axios.post("/api/courses", course, config);
        navigate(`/admin/course/${data._id}`);
      } else {
        await axios.put(`/api/courses/${id}`, course, config);
      }
      alert("Course saved!");
      navigate("/admin");
    } catch (e) {
      console.error("Failed to save course", e);
      alert("Error saving course.");
    }
  };

  // Lessons
  const handleAddLesson = () => {
    updateCourse((d) => {
      d.lessons.push({ title: `New Lesson ${d.lessons.length + 1}`, slides: [] });
      setActiveLessonIndex(d.lessons.length - 1);
      setActiveSlideIndex(null);
    });
  };
  const handleDeleteLesson = (lessonIdx) => {
    updateCourse((d) => {
      d.lessons.splice(lessonIdx, 1);
      if (d.lessons.length === 0) {
        setActiveLessonIndex(null);
        setActiveSlideIndex(null);
      } else if (activeLessonIndex >= lessonIdx) {
        const newIdx = Math.max(0, activeLessonIndex - 1);
        setActiveLessonIndex(newIdx);
        setActiveSlideIndex(d.lessons[newIdx]?.slides.length > 0 ? 0 : null);
      }
    });
  };

  // Slides
  const handleAddSlide = () => {
    if (activeLessonIndex === null) return;
    const defaults = [
      { type: "text", content: "Title", position: { x: 40, y: 30 }, size: { width: 880, height: 60 }, rotation: 0, zIndex: 1, isVisible: true, fontSize: 32, color: "#000000", isBold: true, isItalic: false },
      { type: "text", content: "New Text", position: { x: 40, y: 110 }, size: { width: 440, height: 260 }, rotation: 0, zIndex: 2, isVisible: true, fontSize: 16, color: "#000000", isBold: false, isItalic: false },
      { type: "image", content: "https://placehold.co/440x260/e2e8f0/94a3b8?text=Image", position: { x: 500, y: 110 }, size: { width: 440, height: 180 }, rotation: 0, zIndex: 3, isVisible: true },
    ];
    updateCourse((d) => {
      const slide = {
        title: `Slide ${d.lessons[activeLessonIndex].slides.length + 1}`,
        elements: defaults,
        backgroundColor: "#FFFFFF",
        quiz: null,
      };
      d.lessons[activeLessonIndex].slides.push(slide);
      setActiveSlideIndex(d.lessons[activeLessonIndex].slides.length - 1);
    });
  };
  const handleDeleteSlide = (slideIdx) => {
    updateCourse((d) => {
      const slides = d.lessons[activeLessonIndex]?.slides;
      if (!slides) return;
      slides.splice(slideIdx, 1);
      if (slides.length === 0) setActiveSlideIndex(null);
      else if (activeSlideIndex >= slideIdx) setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
    });
  };

  const handleUpdateSlideTitle = (index, newTitle) => {
    updateCourse((d) => {
      if (d.lessons[activeLessonIndex]?.slides[index]) {
        d.lessons[activeLessonIndex].slides[index].title = newTitle;
      }
    });
  };

  // Elements
  const handleAddElement = (type) => {
    if (activeLessonIndex === null || activeSlideIndex === null) return;
    updateCourse((d) => {
      const s = d.lessons[activeLessonIndex]?.slides[activeSlideIndex];
      if (!s) return;
      const el = {
        type,
        position: { x: 50, y: 50 },
        size: { width: type === "text" ? 250 : 320, height: type === "text" ? 100 : 180 },
        rotation: 0,
        zIndex: (s.elements?.length || 0) + 1,
        isVisible: true,
        content: type === "text" ? "New Text" : "",
        fontSize: 16,
        color: "#000000",
        isBold: false,
        isItalic: false,
      };
      s.elements.push(el);
    });
  };
  const handleUpdateElement = useCallback(
    (idx, newProps) => {
      updateCourse((d) => {
        const el = d.lessons[activeLessonIndex]?.slides[activeSlideIndex]?.elements[idx];
        if (el) Object.assign(el, newProps);
      });
    },
    [activeLessonIndex, activeSlideIndex, updateCourse]
  );
  const handleDeleteElement = useCallback(
    (idx) => {
      setActiveElementIndex(null);
      updateCourse((d) => {
        d.lessons[activeLessonIndex]?.slides[activeSlideIndex]?.elements.splice(idx, 1);
      });
    },
    [activeLessonIndex, activeSlideIndex, updateCourse]
  );

  // DnD
  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (type === "lessons") {
      updateCourse((d) => {
        const [item] = d.lessons.splice(source.index, 1);
        d.lessons.splice(destination.index, 0, item);
        setActiveLessonIndex(destination.index);
      });
    } else if (type === "slides") {
      updateCourse((d) => {
        const lesson = d.lessons[activeLessonIndex];
        if (!lesson) return;
        const [item] = lesson.slides.splice(source.index, 1);
        lesson.slides.splice(destination.index, 0, item);
        setActiveSlideIndex(destination.index);
      });
    }
  };

  // Quiz toggle per slide
  const toggleQuizOnSlide = () => {
    updateCourse((d) => {
      const slide = d.lessons[activeLessonIndex]?.slides[activeSlideIndex];
      if (!slide) return;
      if (slide.quiz) {
        slide.quiz = null;
      } else {
        slide.quiz = {
          type: "single-choice",
          question: "New Question",
          answers: [
            { text: "Correct Answer", isCorrect: true },
            { text: "Incorrect Answer", isCorrect: false },
          ],
          explanation: "Add an explanation.",
          matchPrompts: [],
          matchOptions: [],
        };
      }
    });
  };

  // Tags
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = (e.currentTarget.value || "").trim();
      if (!val) return;
      updateCourse((d) => {
        d.tags = d.tags || [];
        if (!d.tags.includes(val)) d.tags.push(val);
      });
      setTagInput("");
    }
  };
  const handleRemoveTag = (t) => {
    updateCourse((d) => {
      d.tags = (d.tags || []).filter((x) => x !== t);
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
          <input
            name="title"
            value={course.title || ""}
            onChange={(e) => updateCourse((d) => (d.title = e.target.value))}
            placeholder="Course Title"
            className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white mb-4"
          />
          <textarea
            name="description"
            value={course.description || ""}
            onChange={(e) => updateCourse((d) => (d.description = e.target.value))}
            placeholder="Description"
            className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white mb-4"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Course Level</label>
              <select
                name="level"
                value={course.level || ""}
                onChange={(e) => updateCourse((d) => (d.level = e.target.value))}
                className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Specialty</label>
              <select
                name="specialty"
                value={course.specialty || ""}
                onChange={(e) => updateCourse((d) => (d.specialty = e.target.value))}
                className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white"
              >
                <option value="General">General</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
                <option value="Anesthesiology">Anesthesiology</option>
                <option value="Critical Care">Critical Care</option>
              </select>
            </div>
          </div>

          <label className="block text-sm font-medium mb-1 mt-4">Price</label>
          <input
            type="number"
            name="price"
            value={course.price || 0}
            onChange={(e) => updateCourse((d) => (d.price = parseFloat(e.target.value) || 0))}
            className="w-full p-2 border rounded text-gray-900 dark:bg-slate-700 dark:text-white mb-4"
          />

          <label className="block text-sm font-medium mb-1">Tags</label>
          <div className="flex flex-wrap items-center gap-2 p-2 border rounded bg-gray-50 dark:bg-slate-700 mb-4">
            {(course.tags || []).map((t) => (
              <span key={t} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-semibold px-3 py-1 rounded-full">
                {t}
                <button onClick={() => handleRemoveTag(t)} className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-500">
                  <X size={14} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag, press Enter…"
              className="flex-grow bg-transparent focus:outline-none text-sm p-1"
            />
          </div>

          <label className="block text-sm font-medium mb-1">Course Image</label>
          <div className="flex items-center gap-4">
            <img
              src={course.imageUrl}
              alt="Course"
              className="w-48 h-24 object-cover rounded bg-slate-200 dark:bg-slate-700"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => updateCourse((d) => (d.imageUrl = reader.result));
                reader.readAsDataURL(file);
              }}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <button onClick={handleSaveCourse} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Save Course
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Lessons & Slides */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto space-y-6 pr-2">
              <Droppable droppableId="lessons" type="lessons">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-2">Lessons</h2>
                    <button onClick={handleAddLesson} className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 mb-2">
                      Add Lesson
                    </button>
                    {(course.lessons || []).map((lesson, index) => (
                      <Draggable key={`lesson-${index}`} draggableId={`lesson-${index}`} index={index}>
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`p-2 my-1 rounded flex items-center ${
                              activeLessonIndex === index ? "bg-blue-200 dark:bg-blue-800" : "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                            }`}
                          >
                            <div
                              className="flex-grow cursor-pointer"
                              onClick={() => {
                                setActiveLessonIndex(index);
                                setActiveSlideIndex(course.lessons[index]?.slides.length > 0 ? 0 : null);
                              }}
                            >
                              <input
                                type="text"
                                value={lesson.title || ""}
                                onChange={(e) =>
                                  updateCourse((d) => {
                                    d.lessons[index].title = e.target.value;
                                  })
                                }
                                className="font-semibold bg-transparent w-full"
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(index);
                              }}
                              title="Delete Lesson"
                              className="ml-2 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/50"
                            >
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
                        <h2 className="text-xl font-semibold mb-2">Slides</h2>
                        <button onClick={handleAddSlide} className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 mb-2">
                          Add Slide
                        </button>
                        {activeLesson?.slides.map((slide, index) => (
                          <Draggable key={`slide-${index}`} draggableId={`slide-${index}`} index={index}>
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`p-3 my-1 rounded flex items-center justify-between cursor-pointer ${
                                  activeSlideIndex === index
                                    ? "bg-indigo-200 dark:bg-indigo-800"
                                    : "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                                }`}
                              >
                                <span className="flex-grow text-left" onClick={() => setActiveSlideIndex(index)}>
                                  <input
                                    type="text"
                                    value={slide.title || ""}
                                    onChange={(e) =>
                                      updateCourse((d) => {
                                        d.lessons[activeLessonIndex].slides[index].title = e.target.value;
                                      })
                                    }
                                    className="bg-transparent w-full font-medium"
                                  />
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSlide(index);
                                  }}
                                  title="Delete Slide"
                                  className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/50"
                                >
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

          {/* Right: Stage */}
          <div className="col-span-12 lg:col-span-9">
            <div className="sticky top-24">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-x-2">
                    <button onClick={() => handleAddElement("text")} className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
                      Add Text
                    </button>
                    <button onClick={() => handleAddElement("image")} className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
                      Add Image
                    </button>
                    <button onClick={() => handleAddElement("video")} className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
                      Add Video
                    </button>
                  </div>

                  {activeSlide && (
                    <div className="flex items-center gap-4">
                      <button onClick={toggleQuizOnSlide} className="text-sm bg-purple-500 text-white px-3 py-1 rounded-md hover:bg-purple-600">
                        {activeSlide.quiz ? "Remove Quiz" : "Add Quiz to Slide"}
                      </button>
                      <div className="flex items-center gap-2">
                        <label htmlFor="bgColor" className="text-sm font-medium">
                          BG Color:
                        </label>
                        <input
                          id="bgColor"
                          type="color"
                          value={activeSlide.backgroundColor || "#FFFFFF"}
                          onChange={(e) =>
                            updateCourse((d) => {
                              d.lessons[activeLessonIndex].slides[activeSlideIndex].backgroundColor = e.target.value;
                            })
                          }
                          className="w-8 h-8 p-0 border-none rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage (aspect-video ~ 16:9), matches BASE positions */}
                <div
                  className="relative w-full aspect-video rounded-md overflow-hidden shadow-inner"
                  style={{ backgroundColor: activeSlide?.backgroundColor || "#FFFFFF" }}
                  onClick={() => setActiveElementIndex(null)}
                >
                  <TextToolbar
                    isActive={activeElementIndex !== null}
                    element={activeElement}
                    onUpdate={(p) => handleUpdateElement(activeElementIndex, p)}
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
                    <QuizEditor quizData={activeSlide.quiz} onUpdate={(q) => updateCourse((d) => {
                      d.lessons[activeLessonIndex].slides[activeSlideIndex].quiz = q;
                    })} slideIndex={activeSlideIndex} />
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
