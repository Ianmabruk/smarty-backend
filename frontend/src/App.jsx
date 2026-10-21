import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import './styles.css';
import {
  API_BASE,
  API_CONFIG,
  ApiError,
  apiFetch,
  authAPI,
  clearToken,
  readToken,
  saveToken,
} from './api';

const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const token = readToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/users/me');
        if (active) setUser(res?.data || null);
      } catch {
        clearToken();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = (userData) => setUser(userData);
  const updateUser = (next) => setUser((current) => ({ ...(current || {}), ...next }));
  const logout = async () => {
    clearToken();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, updateUser, logout, loading }}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return React.useContext(AuthContext);
}

function LandingScreen() {
  const navigate = useNavigate();

  return (
    <div className="page landing-page">
      <div className="landing-shell card">
        <div className="brand-mark">S</div>
        <h1>Learn with confidence.</h1>
        <p>Smarty helps students learn faster with AI guidance, personalized paths, and daily momentum.</p>
        <div className="landing-actions">
          <button className="btn primary" onClick={() => navigate('/register')}>Get Started</button>
          <button className="btn secondary" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </div>
    </div>
  );
}

function ConfigBanner() {
  if (API_CONFIG.valid) return null;
  return (
    <div className="config-banner" role="status">
      <strong>The app is not connected to the backend yet.</strong>
      <span>{API_CONFIG.reason}</span>
      <span className="config-banner-detail">Configured API base: {API_BASE || 'not set'}</span>
    </div>
  );
}

function AuthError({ error, onRetry }) {
  if (!error) return null;
  const retryable = error instanceof ApiError ? error.isRetryable : false;
  return (
    <div className="error-box" role="alert">
      <span>{error.message || 'Something went wrong. Please try again.'}</span>
      {retryable && onRetry ? (
        <button type="button" className="inline-link" onClick={onRetry}>
          <span>Try again</span>
        </button>
      ) : null}
    </div>
  );
}

function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      setError(new Error('Please fill in all fields'));
      return;
    }

    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;
      saveToken(token);
      login(user);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submit();
  };

  return (
    <div className="page auth-page">
      <ConfigBanner />
      <div className="auth-hero card">
        <div className="brand-row">
          <div className="mini-logo">S</div>
          <div className="brand-name">Smarty</div>
        </div>
        <h1>Your next breakthrough starts here.</h1>
        <p>Study with your AI tutor, grounded in your curriculum.</p>
      </div>

      <form className="auth-form card" onSubmit={handleSubmit}>
        <h2>Sign in</h2>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
        </label>
        <AuthError error={error} onRetry={submit} />
        <button className="btn primary full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        <button type="button" className="inline-link" onClick={() => navigate('/register')}>Need an account? <span>Sign Up</span></button>
      </form>
    </div>
  );
}

function RegisterScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !email || !password || !confirm) {
      setError(new Error('Please fill in all fields'));
      return;
    }
    if (password.length < 6) {
      setError(new Error('Password must be at least 6 characters'));
      return;
    }
    if (password !== confirm) {
      setError(new Error('Passwords do not match'));
      return;
    }

    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authAPI.register({ name, email, password });
      const { token, user } = res.data;
      saveToken(token);
      login(user);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submit();
  };

  return (
    <div className="page auth-page">
      <ConfigBanner />
      <div className="auth-hero card">
        <div className="brand-row">
          <div className="mini-logo">S</div>
          <div className="brand-name">Smarty</div>
        </div>
        <h1>Create your account</h1>
        <p>Join thousands of students leveling up their grades.</p>
      </div>

      <form className="auth-form card" onSubmit={handleSubmit}>
        <h2>Sign up</h2>
        <label className="field">
          <span>Full name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
        </label>
        <AuthError error={error} onRetry={submit} />
        <button className="btn primary full" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
        <button type="button" className="inline-link" onClick={() => navigate('/login')}>Already registered? <span>Sign In</span></button>
      </form>
    </div>
  );
}

function HomeScreen() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/courses');
        setCourses(res?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const title = (course?.title || '').toLowerCase();
      const matchQuery = title.includes(query.toLowerCase());
      const matchLevel = level === 'All' || (course?.level || '').toLowerCase() === level.toLowerCase();
      return matchQuery && matchLevel;
    });
  }, [courses, query, level]);

  const handleAskSmarty = async () => {
    const trimmed = aiPrompt.trim();
    if (!trimmed) return;

    setAiLoading(true);
    setAiError('');
    try {
      const res = await apiFetch('/ai/explain', { method: 'POST', body: JSON.stringify({ topic: trimmed }) });
      setAiResponse(res?.data?.explanation || 'No answer available yet.');
      setAiPrompt('');
    } catch (err) {
      setAiError(err.message || 'Unable to reach Smarty right now.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero card">
        <div className="hero-top">
          <div>
            <h2>Good morning, learner 👋</h2>
            <p>Your next win is one lesson away.</p>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <span>Courses</span>
            <strong>{courses.length}</strong>
          </div>
          <div className="stat-card accent">
            <span>Active</span>
            <strong>{filtered.length}</strong>
          </div>
        </div>
      </section>

      <section className="ai-panel card">
        <div className="panel-header">
          <div>
            <small>Smarty AI tutor</small>
            <h3>Ask for a quick explanation</h3>
          </div>
          <div className="spark-badge">✦</div>
        </div>
        <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ask Smarty anything..." rows={3} />
        <div className="chip-row">
          {['Explain photosynthesis', 'Help me revise algebra', 'Summarise my notes'].map((suggestion) => (
            <button key={suggestion} className="chip" onClick={() => setAiPrompt(suggestion)}>{suggestion}</button>
          ))}
        </div>
        <button className="btn primary full" onClick={handleAskSmarty} disabled={!aiPrompt.trim() || aiLoading}>{aiLoading ? 'Asking...' : 'Ask Smarty'}</button>
        {aiError && <div className="error-box">{aiError}</div>}
        {aiResponse && <div className="ai-response">{aiResponse}</div>}
      </section>

      <section className="search-row card">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses..." />
      </section>

      <section className="explore-section">
        <div className="section-header">
          <h3>Explore</h3>
          <span>Pick a path that fits your level</span>
        </div>
        <div className="chip-row horizontal">
          {levels.map((levelOption) => (
            <button key={levelOption} className={`chip ${level === levelOption ? 'selected' : ''}`} onClick={() => setLevel(levelOption)}>{levelOption}</button>
          ))}
        </div>
      </section>

      {loading && <div className="loading-box">Loading...</div>}
      {!loading && filtered.length === 0 && <div className="empty-box">No courses found.</div>}

      {!loading && filtered.length > 0 && (
        <div className="course-grid">
          {filtered.map((course) => (
            <article key={course.id} className="course-card card" onClick={() => navigate(`/course/${course.id}`)}>
              <div className="course-icon">{(course.title || '?').charAt(0).toUpperCase()}</div>
              <h4>{course.title}</h4>
              <div className="course-meta">Level: {course.level}</div>
              {course.description ? <p>{course.description}</p> : null}
              <div className="course-footer">
                <span className="pill">{course.level}</span>
                <span className="arrow">→</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [courseRes, lessonsRes, quizzesRes] = await Promise.all([
          apiFetch(`/courses/${id}`),
          apiFetch(`/lessons/course/${id}`),
          apiFetch(`/quizzes/course/${id}`),
        ]);
        setCourse(courseRes.data);
        setLessons(lessonsRes.data || []);
        setQuizzes(quizzesRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="loading-box">Loading course...</div>;
  if (!course) return <div className="empty-box">Course not found.</div>;

  return (
    <div className="page course-detail-page">
      <div className="course-hero card">
        <div className="course-icon large">{(course.title || '?').charAt(0).toUpperCase()}</div>
        <h1>{course.title}</h1>
        <div className="course-meta">Level: {course.level}</div>
        {course.description ? <p>{course.description}</p> : null}
      </div>

      <div className="content-block">
        <h3>Lessons</h3>
        {lessons.length === 0 ? <div className="empty-box">No lessons yet.</div> : lessons.map((lesson) => (
          <button key={lesson.id} className="list-item" onClick={() => navigate(`/lesson/${lesson.id}`)}>
            <span>{`Lesson ${lesson.order}: ${lesson.title}`}</span>
            <strong>→</strong>
          </button>
        ))}
      </div>

      <div className="content-block">
        <h3>Quizzes</h3>
        {quizzes.length === 0 ? <div className="empty-box">No quizzes yet.</div> : quizzes.map((quiz) => (
          <button key={quiz.id} className="list-item" onClick={() => navigate(`/quiz/${quiz.id}`)}>
            <span>{quiz.title}</span>
            <strong>{quiz.questions?.length || 0}Q</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function LessonScreen() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/lessons/${id}`);
        setLesson(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const res = await apiFetch('/ai/explain', { method: 'POST', body: JSON.stringify({ lesson_id: Number(id) }) });
      setExplanation(res?.data?.explanation || '');
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };

  if (loading) return <div className="loading-box">Loading lesson...</div>;
  if (!lesson) return <div className="empty-box">Lesson not found.</div>;

  return (
    <div className="page lesson-page">
      <div className="hero-strip card">
        <h1>{lesson.title}</h1>
      </div>
      <div className="content-block">
        <h3>Lesson content</h3>
        <p>{lesson.content}</p>
        <button className="btn primary" onClick={handleExplain} disabled={explaining}>{explaining ? 'Explaining...' : 'Explain with AI'}</button>
        {explanation && <div className="ai-response">{explanation}</div>}
      </div>
    </div>
  );
}

function QuizScreen() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/quizzes/${id}`);
        setQuiz(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = async () => {
    const formatted = Object.entries(answers).map(([qid, answer]) => ({ question_id: Number(qid), answer }));
    if (!formatted.length) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/quizzes/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: formatted }),
      });
      setResult(res.data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-box">Loading quiz...</div>;
  if (!quiz) return <div className="empty-box">Quiz not found.</div>;

  return (
    <div className="page quiz-page">
      <div className="hero-strip card">
        <h1>{quiz.title}</h1>
      </div>
      <div className="content-block">
        {quiz.questions.map((question) => (
          <div key={question.id} className="question-box card">
            <h4>{question.text}</h4>
            {question.type === 'multiple_choice' && question.options ? (
              <div className="options-list">
                {question.options.map((option) => (
                  <button key={option} className={`option-btn ${answers[question.id] === option ? 'selected' : ''}`} onClick={() => setAnswer(question.id, option)}>
                    <span className="radio-dot" />
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            ) : (
              <input type="text" value={answers[question.id] || ''} onChange={(e) => setAnswer(question.id, e.target.value)} placeholder="Type your answer" />
            )}
          </div>
        ))}

        {!submitted ? (
          <button className="btn primary full" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Quiz'}</button>
        ) : result ? (
          <div className="result-box card">
            <h3>Your Score</h3>
            <div className="score-number">{result.score} <span>/ {result.total}</span></div>
            <div>{result.total ? Math.round((result.score / result.total) * 100) : 0}% accuracy</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProgressScreen() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/progress');
        setProgress(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = progress.filter((item) => item.completed).length;
  const pct = progress.length ? Math.round((completed / progress.length) * 100) : 0;

  if (loading) return <div className="loading-box">Loading progress...</div>;

  return (
    <div className="page progress-page">
      <div className="header-block">
        <h1>Your Progress</h1>
        <p>Track how far you&apos;ve come.</p>
      </div>
      <div className="stats-grid three">
        <div className="stat-card"><span>Lessons</span><strong>{completed}</strong></div>
        <div className="stat-card accent"><span>In progress</span><strong>{progress.length - completed}</strong></div>
        <div className="stat-card success"><span>Completion</span><strong>{pct}%</strong></div>
      </div>
      <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
      <div className="content-block">
        <h3>Recent activity</h3>
        {progress.length === 0 ? <div className="empty-box">No progress yet.</div> : progress.map((item) => (
          <div key={item.id} className="list-item static">
            <span>Course {item.course_id}</span>
            <strong>{item.completed ? 'Completed' : 'In progress'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadNotes = async () => {
    try {
      const res = await apiFetch('/notes');
      setNotes(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return;
    setLoading(true);
    try {
      await apiFetch('/notes', { method: 'POST', body: JSON.stringify({ title: title || 'Untitled note', content }) });
      setTitle('');
      setContent('');
      await loadNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page notes-page">
      <div className="editor card">
        <h2>Quick notes</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your summary..." rows={6} />
        <button className="btn primary full" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save note'}</button>
      </div>
      <div className="content-block">
        <h3>Saved notes</h3>
        {notes.length === 0 ? <div className="empty-box">No notes yet.</div> : notes.map((note) => (
          <div key={note.id} className="note-card card">
            <h4>{note.title || 'Untitled note'}</h4>
            <p>{note.content || 'No content saved yet.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = ['Account settings', 'Notifications', 'Accessibility', 'Help & support', 'Privacy policy'];

  return (
    <div className="page profile-page">
      <div className="profile-header card">
        <div className="avatar">{(user?.name || '?').charAt(0).toUpperCase()}</div>
        <h2>{user?.name || 'User'}</h2>
        <p>{user?.email || ''}</p>
        <span className="role-pill">{user?.role || 'student'}</span>
      </div>
      <div className="content-block">
        <div className="list-stack">
          {menuItems.map((item) => (
            <button key={item} className="list-item static" onClick={() => {}}>{item}</button>
          ))}
        </div>
        <button className="btn danger full" onClick={async () => { await logout(); navigate('/login'); }}>Sign Out</button>
      </div>
    </div>
  );
}

function ChatScreen() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/chat');
      const items = res.data || [];
      setConversations(items);
      if (items.length) {
        const selectedId = activeId && items.some((item) => item.id === activeId) ? activeId : items[0].id;
        setActiveId(selectedId);
        const chatRes = await apiFetch(`/chat/${selectedId}`);
        setMessages(chatRes?.data?.messages || []);
      } else {
        setMessages([]);
        setActiveId(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const createConversation = async () => {
    try {
      const res = await apiFetch('/chat', { method: 'POST', body: JSON.stringify({ title: 'New chat' }) });
      const newChat = res?.data;
      if (!newChat?.id) return null;
      setConversations((prev) => [newChat, ...prev]);
      setActiveId(newChat.id);
      setMessages([]);
      return newChat.id;
    } catch (err) {
      setError(err.message || 'Unable to create chat');
      return null;
    }
  };

  const sendMessage = async () => {
    if (!draft.trim() || sending) return;
    const text = draft.trim();
    const conversationId = activeId || (await createConversation());
    if (!conversationId) return;
    setSending(true);
    setError('');

    try {
      const res = await apiFetch(`/chat/${conversationId}/message`, {
        method: 'POST',
        body: JSON.stringify({ content: text, role: 'user' }),
      });
      setDraft('');
      const payload = res?.data || {};
      const nextMessages = [...(payload?.conversation ? messages : []), payload?.user_message, payload?.assistant_message].filter(Boolean);
      setMessages(nextMessages);
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page chat-page">
      <div className="chat-shell">
        <aside className="chat-sidebar card">
          <div className="sidebar-header">
            <h3>Recent chats</h3>
            <button className="mini-btn" onClick={createConversation}>+</button>
          </div>
          {loading ? <div className="loading-box small">Loading...</div> : conversations.map((conversation) => (
            <button key={conversation.id} className={`conversation-item ${activeId === conversation.id ? 'active' : ''}`} onClick={async () => {
              setActiveId(conversation.id);
              const chatRes = await apiFetch(`/chat/${conversation.id}`);
              setMessages(chatRes?.data?.messages || []);
            }}>
              <span>{conversation.title || 'New chat'}</span>
              <small>{conversation.message_count || 0} messages</small>
            </button>
          ))}
        </aside>

        <main className="chat-panel card">
          <header className="chat-header">
            <h3>{conversations.find((c) => c.id === activeId)?.title || 'Smarty chat'}</h3>
          </header>
          <div className="chat-messages">
            {messages.length === 0 ? <div className="empty-box chat-empty">Ask Smarty anything.</div> : messages.map((message, index) => (
              <div key={`${message.id || index}-${message.role}`} className={`message-row ${message.role === 'user' ? 'user' : 'assistant'}`}>
                <div className="message-bubble">{message.content}</div>
              </div>
            ))}
          </div>
          {error && <div className="error-box">{error}</div>}
          <div className="chat-composer">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Type your message..." />
            <button className="btn primary" onClick={sendMessage} disabled={!draft.trim() || sending}>{sending ? 'Sending...' : 'Send'}</button>
          </div>
        </main>
      </div>
    </div>
  );
}

function OnboardingScreen() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [age, setAge] = useState(user?.age || '');
  const [educationGroup, setEducationGroup] = useState(user?.education_group || 'Secondary');
  const [gradeLevel, setGradeLevel] = useState(user?.grade_level || '');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const ageValue = Number(age);
    if (!age || Number.isNaN(ageValue) || ageValue < 5 || ageValue > 100) {
      alert('Please enter a valid age between 5 and 100.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ age: ageValue, education_group: educationGroup, grade_level: gradeLevel || 'Not specified', onboarding_completed: true }),
      });
      updateUser(res.data);
      navigate('/');
    } catch (err) {
      alert(err.message || 'Unable to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page onboarding-page">
      <div className="card">
        <h2>Let&apos;s personalize your learning</h2>
        <label className="field">
          <span>Age</span>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Enter age" />
        </label>
        <label className="field">
          <span>Education level</span>
          <div className="option-grid">
            {['Primary', 'Secondary', 'College', 'Adult learning', 'Other'].map((option) => (
              <button key={option} type="button" className={`mini-chip ${educationGroup === option ? 'selected' : ''}`} onClick={() => setEducationGroup(option)}>{option}</button>
            ))}
          </div>
        </label>
        <label className="field">
          <span>Current grade or learning stage</span>
          <input type="text" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="Example: Grade 8, Year 11, beginner" />
        </label>
        <button className="btn primary full" onClick={handleContinue} disabled={loading}>{loading ? 'Saving...' : 'Continue to Smarty'}</button>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return <div className="loading-box">Loading...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-inline">Smarty</div>
        <nav className="nav">
          <button className={location.pathname === '/' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('/')}>Learn</button>
          <button className={location.pathname.startsWith('/chat') ? 'nav-item active' : 'nav-item'} onClick={() => navigate('/chat')}>Chat</button>
          <button className={location.pathname === '/progress' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('/progress')}>Progress</button>
          <button className={location.pathname === '/notes' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('/notes')}>Notes</button>
          <button className={location.pathname === '/profile' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('/profile')}>Profile</button>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/course/:id" element={<CourseDetailScreen />} />
        <Route path="/lesson/:id" element={<LessonScreen />} />
        <Route path="/quiz/:id" element={<QuizScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/notes" element={<NotesScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
