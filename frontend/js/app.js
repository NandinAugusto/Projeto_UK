/**
 * app.js
 * Main Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Shared State
    let forcesData = [];
    let availabilityData = [];

    // Elements
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Init
    async function init() {
        showLoading();
        try {
            forcesData = await PoliceAPI.fetchForces();
            forcesData.sort((a, b) => a.name.localeCompare(b.name));
            
            availabilityData = await PoliceAPI.fetchAvailability();
            
            populateSelect('forceSelect', forcesData, 'id', 'name');
            populateSelect('nhForceSelect', forcesData, 'id', 'name');
            
            // Initial filtering for default dates
            filterForcesForDropdown('crimeDate', 'crimeForceSelect');
            filterForcesForDropdown('ssDate', 'ssForceSelect');
        } catch (error) {
            console.error("Failed to initialize app, backend might not be running.", error);
            alert("Error connecting to the backend. Please ensure the backend server is running.");
        } finally {
            hideLoading();
        }
    }

    // --- Sidebar Navigation ---
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active classes
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked button and target tab
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
        });
    });

    // --- FORCES TAB LOGIC ---
    document.getElementById('forceSelect').addEventListener('change', async (e) => {
        const forceId = e.target.value;
        if (!forceId) return;

        showLoading();
        try {
            const details = await PoliceAPI.fetchForceDetails(forceId);
            const officers = await PoliceAPI.fetchSeniorOfficers(forceId);
            
            // Render Details
            let detailsHtml = '';
            if (details) {
                detailsHtml += `<h3 class="text-accent" style="margin-bottom:1rem;">${details.name}</h3>`;
                if (details.description) detailsHtml += `<p style="color:var(--text-secondary); margin-bottom:1rem; font-size:0.9rem;">${details.description.replace(/(<([^>]+)>)/gi, "")}</p>`;
                if (details.url) detailsHtml += `<a href="${details.url}" target="_blank" class="text-accent" style="text-decoration:none;">Oficial Website &rarr;</a>`;
            }
            document.getElementById('forceDetailsContent').innerHTML = detailsHtml || '<p class="placeholder-text">No details found</p>';

            // Render Officers
            let officersHtml = '<ul class="info-list">';
            if (officers && Array.isArray(officers)) {
                officers.forEach(o => {
                    officersHtml += `<li class="info-item"><strong>${o.name}</strong><br><small style="color:var(--text-tertiary)">${o.rank}</small></li>`;
                });
            }
            officersHtml += '</ul>';
            document.getElementById('officersContent').innerHTML = officersHtml === '<ul class="info-list"></ul>' ? '<p class="placeholder-text">No officers found</p>' : officersHtml;
        } catch (err) {
            console.error("Error fetching force data:", err);
            document.getElementById('forceDetailsContent').innerHTML = '<p class="placeholder-text">Error loading data</p>';
            document.getElementById('officersContent').innerHTML = '<p class="placeholder-text">Error loading data</p>';
        } finally {
            hideLoading();
        }
    });

    // --- CRIMES TAB LOGIC ---
    document.getElementById('crimeDate').addEventListener('change', () => filterForcesForDropdown('crimeDate', 'crimeForceSelect'));

    document.getElementById('crimeForceSelect').addEventListener('change', async (e) => {
        const forceId = e.target.value;
        if(!forceId) return;
        
        showLoading();
        const nhs = await PoliceAPI.fetchNeighbourhoods(forceId);
        populateSelect('crimeNhSelect', nhs, 'id', 'name');
        hideLoading();
    });

    document.getElementById('btnFetchCrimes').addEventListener('click', async () => {
        const forceId = document.getElementById('crimeForceSelect').value;
        const nhId = document.getElementById('crimeNhSelect').value;
        const date = document.getElementById('crimeDate').value;
        
        if (!forceId || !nhId) return alert('Force and Neighbourhood required');
        
        showLoading();
        try {
            const data = await PoliceAPI.fetchCrimesAnalyticsByNeighbourhood(forceId, nhId, date);
            
            if (!data || !data.analytics || data.analytics.total_crimes === 0) {
                alert('No crimes found for this neighbourhood and date.');
                return;
            }

            renderChart('crimeChart', data.analytics.by_category, 'Crimes by Category', 'bar');
            renderChart('outcomeChart', data.analytics.by_outcome, 'Crimes by Outcome', 'doughnut');
            renderChart('hotspotsChart', data.analytics.hotspots, 'Top Danger Zones', 'bar');
        } catch (error) {
            console.error("Error fetching crimes analytics", error);
            alert("An error occurred or the area is too large for the UK Police API.");
        } finally {
            hideLoading();
        }
    });

    // --- NEIGHBOURHOODS TAB LOGIC ---
    document.getElementById('nhForceSelect').addEventListener('change', async (e) => {
        const forceId = e.target.value;
        if(!forceId) return;
        
        showLoading();
        const nhs = await PoliceAPI.fetchNeighbourhoods(forceId);
        populateSelect('nhSelect', nhs, 'id', 'name');
        hideLoading();
    });

    document.getElementById('nhSelect').addEventListener('change', async (e) => {
        const forceId = document.getElementById('nhForceSelect').value;
        const nhId = e.target.value;
        if(!forceId || !nhId) return;

        showLoading();
        const team = await PoliceAPI.fetchNeighbourhoodTeam(forceId, nhId);
        const priorities = await PoliceAPI.fetchNeighbourhoodPriorities(forceId, nhId);
        hideLoading();

        // Render Team
        let teamHtml = '<ul class="info-list">';
        team.forEach(t => {
            teamHtml += `<li class="info-item"><strong>${t.name}</strong><br><small style="color:var(--text-tertiary)">${t.rank}</small></li>`;
        });
        teamHtml += '</ul>';
        document.getElementById('nhTeamContent').innerHTML = teamHtml || '<p class="placeholder-text">No team data found</p>';

        // Render Priorities
        let pHtml = '<ul class="info-list">';
        priorities.forEach(p => {
            pHtml += `<li class="info-item" style="border-left-color: var(--accent-2)"><p style="font-size:0.9rem">${p.issue}</p></li>`;
        });
        pHtml += '</ul>';
        document.getElementById('nhPrioritiesContent').innerHTML = pHtml || '<p class="placeholder-text">No priorities listed</p>';
    });

    // --- STOP & SEARCH TAB LOGIC ---
    document.getElementById('ssDate').addEventListener('change', () => filterForcesForDropdown('ssDate', 'ssForceSelect'));

    document.getElementById('btnFetchStops').addEventListener('click', async () => {
        const forceId = document.getElementById('ssForceSelect').value;
        const date = document.getElementById('ssDate').value;
        
        if (!forceId) return alert('Select a force');

        showLoading();
        const data = await PoliceAPI.fetchStopAndSearchAnalyticsByForce(forceId, date);
        hideLoading();

        if (!data || data.total_records === 0) {
            alert('No data found for this selection.');
            ['ssAgeChart', 'ssGenderChart', 'ssEthnicityChart', 'ssObjectChart', 'ssOutcomeChart'].forEach(id => {
                const chart = Chart.getChart(id);
                if (chart) chart.destroy();
            });
            return;
        }

        const analytics = data.analytics;
        renderChart('ssAgeChart', analytics.age_profile, 'Age Profile', 'bar');
        renderChart('ssGenderChart', analytics.gender_profile, 'Gender', 'doughnut');
        renderChart('ssEthnicityChart', analytics.ethnicity_profile, 'Ethnicity Profile', 'doughnut');
        renderChart('ssObjectChart', analytics.object_of_search, 'Object of Search', 'bar');
        
        renderChart('ssLegislationChart', analytics.legislation, 'Legislation Invoked', 'doughnut');
        renderChart('ssTypeChart', analytics.type, 'Type of Search', 'doughnut');
        document.getElementById('stripSearchCount').innerText = data.strip_searches || 0;
        
        renderChart('ssOutcomeChart', analytics.outcomes, 'Outcomes', 'bar');
    });

    // --- RANKINGS TAB LOGIC ---
    document.getElementById('btnFetchRankings').addEventListener('click', async () => {
        const date = document.getElementById('rankingsDate').value;
        if (!date) return alert('Select a date');

        showLoading();
        // Gathering from 40+ forces takes a few seconds
        const data = await PoliceAPI.fetchNationalRankings(date);
        hideLoading();

        if (!data || data.total_records === 0 || data.error) {
            alert(data?.error || 'No data found for this selection.');
            ['rankForceChart', 'rankEthnicityChart', 'rankAgeChart', 'rankObjectChart'].forEach(id => {
                const chart = Chart.getChart(id);
                if (chart) chart.destroy();
            });
            return;
        }

        const analytics = data.analytics;
        renderChart('rankForceChart', analytics.force_ranking, 'Stops by Force (Top 15)', 'bar');
        renderChart('rankEthnicityChart', analytics.ethnicity_ranking, 'National Ethnicity', 'doughnut');
        renderChart('rankAgeChart', analytics.age_ranking, 'National Age Range', 'bar');
        renderChart('rankObjectChart', analytics.object_ranking, 'Object of Search', 'bar');
    });

    // --- CHART LOGIC (WITH HSL CSI VIBE) ---
    function generatePortfolioColor(index, total) {
        // Spread the hue evenly across the 360-degree color wheel based on index
        const h = Math.floor((index * (360 / total)) % 360);
        const s = Math.floor(70 + Math.random() * 30); // 70 to 100
        const l = Math.floor(50 + Math.random() * 20); // 50 to 70
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    function renderChart(canvasId, dataObj, label, type = 'bar') {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const existingChart = Chart.getChart(canvasId);
        if (existingChart) existingChart.destroy();
        
        const labels = Object.keys(dataObj);
        const dataValues = Object.values(dataObj);
        const bgColors = labels.map((_, idx) => generatePortfolioColor(idx, labels.length));
        
        Chart.defaults.color = '#8b99ae';
        Chart.defaults.font.family = "'Space Mono', monospace";

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: type === 'doughnut', position: 'right' }
            }
        };

        if (type === 'bar') {
            options.scales = {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { grid: { display: false } }
            };
        }

        new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: dataValues,
                    backgroundColor: type === 'doughnut' ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                    borderColor: bgColors,
                    borderWidth: 2,
                    borderRadius: type === 'bar' ? 4 : 0
                }]
            },
            options: options
        });
    }

    // --- UTILS ---
    function filterForcesForDropdown(dateInputId, selectId) {
        const dateVal = document.getElementById(dateInputId).value; // YYYY-MM
        const select = document.getElementById(selectId);
        
        let availableForceIds = null;
        
        // Find availability for this date
        const dateInfo = availabilityData.find(d => d.date === dateVal);
        if (dateInfo && dateInfo['stop-and-search']) {
            availableForceIds = dateInfo['stop-and-search'];
        }

        let filteredForces = forcesData;
        if (availableForceIds) {
            filteredForces = forcesData.filter(f => availableForceIds.includes(f.id));
        } else if (dateInfo === undefined) {
            // No data at all for this date
            filteredForces = [];
        }
        
        // Remember current selection
        const currentVal = select.value;
        populateSelect(selectId, filteredForces, 'id', 'name');
        
        // Restore selection if still valid
        if (filteredForces.some(f => f.id === currentVal)) {
            select.value = currentVal;
        } else {
            // Trigger change event to clear dependent dropdowns if necessary
            select.dispatchEvent(new Event('change'));
        }
    }

    function populateSelect(id, items, valProp, textProp) {
        const select = document.getElementById(id);
        select.innerHTML = '<option value="">-- Select --</option>';
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valProp];
            opt.textContent = item[textProp];
            select.appendChild(opt);
        });
    }

    function showLoading() { loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { loadingOverlay.classList.add('hidden'); }

    init();
});
