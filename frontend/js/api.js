/**
 * api.js
 * Comprehensive API Wrapper for the UK Police Library Dashboard
 */

// Substitua o link do Render abaixo após o deploy do Backend
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000/api' 
    : 'https://SUA-API.onrender.com/api';

class PoliceAPI {
    // --- FORCES ---
    static async fetchForces() {
        const res = await fetch(`${API_BASE_URL}/forces/`);
        return res.ok ? await res.json() : [];
    }
    static async fetchAvailability() {
        const res = await fetch(`${API_BASE_URL}/crimes/availability`);
        return res.ok ? await res.json() : [];
    }
    static async fetchForceDetails(forceId) {
        const res = await fetch(`${API_BASE_URL}/forces/${forceId}`);
        return res.ok ? await res.json() : null;
    }
    static async fetchSeniorOfficers(forceId) {
        const res = await fetch(`${API_BASE_URL}/forces/${forceId}/senior-officers`);
        return res.ok ? await res.json() : [];
    }

    // --- CRIMES ---
    static async fetchCrimesAnalyticsByNeighbourhood(forceId, nhId, date) {
        let url = `${API_BASE_URL}/crimes/analytics/by-neighbourhood?force=${forceId}&neighbourhood=${nhId}`;
        if (date) url += `&date=${date}`;
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
    }
    
    // --- NEIGHBOURHOODS ---
    static async fetchNeighbourhoods(forceId) {
        const res = await fetch(`${API_BASE_URL}/neighbourhoods/${forceId}/neighbourhoods`);
        return res.ok ? await res.json() : [];
    }
    static async fetchNeighbourhoodTeam(forceId, nhId) {
        const res = await fetch(`${API_BASE_URL}/neighbourhoods/${forceId}/${nhId}/team`);
        return res.ok ? await res.json() : [];
    }
    static async fetchNeighbourhoodPriorities(forceId, nhId) {
        const res = await fetch(`${API_BASE_URL}/neighbourhoods/${forceId}/${nhId}/priorities`);
        return res.ok ? await res.json() : [];
    }

    // --- STOP & SEARCH ---
    static async fetchStopAndSearchByForce(forceId, dateStr = '') {
        let url = `${API_BASE_URL}/stop-and-search/by-force?force=${forceId}`;
        if (dateStr) url += `&date=${dateStr}`;
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    }
    
    static async fetchStopAndSearchAnalyticsByForce(forceId, dateStr = '') {
        let url = `${API_BASE_URL}/stop-and-search/analytics/by-force?force=${forceId}`;
        if (dateStr) url += `&date=${dateStr}`;
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
    }

    static async fetchNationalRankings(dateStr) {
        let url = `${API_BASE_URL}/stop-and-search/analytics/rankings?date=${dateStr}`;
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
    }
}
