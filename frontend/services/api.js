import axios from "axios";
import { Platform, Alert } from "react-native";
import { API_BASE } from "./config";

// Token storage abstraction — uses SecureStore on native, localStorage on web
let SecureStore = null;
if (Platform.OS !== "web") {
  try {
    SecureStore = require("expo-secure-store");
  } catch (e) {
    SecureStore = null;
  }
}

const tokenStorage = {
  async getItemAsync(key) {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    if (SecureStore) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    }
    return null;
  },
  async setItemAsync(key, value) {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {}
      return;
    }
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {}
    }
  },
  async deleteItemAsync(key) {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }
    if (SecureStore) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
    }
  },
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getItemAsync("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.deleteItemAsync("accessToken");
    }
    return Promise.reject(error);
  }
);

export default api;

export const saveToken = (token) => tokenStorage.setItemAsync("accessToken", token);
export const getToken = () => tokenStorage.getItemAsync("accessToken");
export const deleteToken = () => tokenStorage.deleteItemAsync("accessToken");

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

export const coursesAPI = {
  list: () => api.get("/courses"),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post("/courses", data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
};

export const lessonsAPI = {
  list: (courseId) => api.get(`/lessons/course/${courseId}`),
  get: (id) => api.get(`/lessons/${id}`),
  create: (data) => api.post("/lessons", data),
  update: (id, data) => api.put(`/lessons/${id}`, data),
  delete: (id) => api.delete(`/lessons/${id}`),
};

export const quizzesAPI = {
  list: (courseId) => api.get(`/quizzes/course/${courseId}`),
  get: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post("/quizzes", data),
  addQuestion: (quizId, data) => api.post(`/quizzes/${quizId}/questions`, data),
  submit: (quizId, data) => api.post(`/quizzes/${quizId}/submit`, data),
};

export const progressAPI = {
  list: () => api.get("/progress"),
  byCourse: (courseId) => api.get(`/progress/course/${courseId}`),
  mark: (data) => api.post("/progress", data),
};

export const usersAPI = {
  me: () => api.get("/users/me"),
  list: () => api.get("/users"),
  get: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put("/users/me", data),
};

export const chatAPI = {
  list: () => api.get("/chat"),
  create: (data) => api.post("/chat", data),
  get: (id) => api.get(`/chat/${id}`),
  send: (id, data) => api.post(`/chat/${id}/message`, data),
};

export const notesAPI = {
  list: () => api.get("/notes"),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
};

export const aiAPI = {
  explain: (data) => api.post("/ai/explain", data),
  summarize: (data) => api.post("/ai/summarize", data),
};