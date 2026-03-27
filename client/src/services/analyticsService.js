import api from './api';

const AnalyticsService = {
    // Get overall student analytics
    getStudentAnalytics: async (userId) => {
        const response = await api.get(`/analytics/student/${userId}`);
        return response.data;
    },

    // Get weak topics
    async getWeakTopics(userId) {
        try {
            const response = await api.get(`/analytics/student/${userId}/weak-topics`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getPlacementReadiness(userId) {
        try {
            const response = await api.get(`/analytics/student/${userId}/readiness`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getAIInsights(userId) {
        try {
            const response = await api.get(`/analytics/student/${userId}/ai-insights`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getSubjectProficiency(userId) {
        try {
            const response = await api.get(`/analytics/student/${userId}/subject-proficiency`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getStudentReportOverall(userId, filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            const query = params.toString();
            const response = await api.get(`/analytics/student/${userId}/report/overall${query ? `?${query}` : ''}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getStudentSubjectHistory(userId, subject, filters = {}) {
        try {
            const params = new URLSearchParams();
            if (subject) params.append('subject', subject);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            const response = await api.get(`/analytics/student/${userId}/report/subject-history?${params.toString()}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default AnalyticsService;
