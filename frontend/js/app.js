/**
 * app.js
 * Premium Dashboard Logic merged with Original Full-Featured App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Shared State
    let forcesData = [];
    let availabilityData = [];
    let activeCharts = {};

    // Elements
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // --- Mouse Tracking for Glow Cards (Optimized for 60fps) ---
    function setupGlowCards() {
        const cards = document.querySelectorAll('.glow-card');
        
        cards.forEach(card => {
            let rafId = null;
            let targetX = 0;
            let targetY = 0;

            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                targetX = e.clientX - rect.left;
                targetY = e.clientY - rect.top;

                if (!rafId) {
                    rafId = requestAnimationFrame(() => {
                        card.style.setProperty('--mouse-x', `${targetX}px`);
                        card.style.setProperty('--mouse-y', `${targetY}px`);
                        rafId = null;
                    });
                }
            });
            
            // Clean up RAF on mouseleave
            card.addEventListener('mouseleave', () => {
                if(rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            });
        });
    }
    setupGlowCards();

    // --- Custom Dropdown Logic ---
    function setupCustomDropdown(customSelectId, nativeSelectId, onChangeCallback) {
        const selectWrapper = document.getElementById(customSelectId);
        const nativeSelect = document.getElementById(nativeSelectId);
        if(!selectWrapper || !nativeSelect) return;
        
        const trigger = selectWrapper.querySelector('.select-trigger');
        const triggerText = selectWrapper.querySelector('.trigger-text');
        const optionsContainer = selectWrapper.querySelector('.select-options');
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if(trigger.classList.contains('disabled')) return;
            
            // Close other dropdowns
            document.querySelectorAll('.custom-select').forEach(el => {
                if(el !== selectWrapper) el.classList.remove('open');
            });
            
            selectWrapper.classList.toggle('open');
        });

        optionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-search')) return;
            const option = e.target.closest('.option');
            if(option) {
                const value = option.dataset.value;
                const text = option.textContent;
                triggerText.textContent = text;
                selectWrapper.classList.remove('open');
                
                // Sync to native select
                nativeSelect.value = value;
                
                // Reset search
                const search = selectWrapper.querySelector('.dropdown-search');
                if (search) search.value = '';
                selectWrapper.querySelectorAll('.option').forEach(opt => opt.style.display = 'block');

                // Dispatch native change event
                nativeSelect.dispatchEvent(new Event('change'));
                if(onChangeCallback) onChangeCallback(value);
            }
        });

        optionsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('dropdown-search')) {
                const term = e.target.value.toLowerCase();
                selectWrapper.querySelectorAll('.option').forEach(opt => {
                    const text = opt.textContent.toLowerCase();
                    opt.style.display = text.includes(term) ? 'block' : 'none';
                });
            }
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
    });

    // We intercept populateSelect to also populate the custom UI dropdown
    function populateSelect(nativeId, customId, items, valProp, textProp, placeholder) {
        const nativeSelect = document.getElementById(nativeId);
        const customWrapper = document.getElementById(customId);
        
        // Native
        nativeSelect.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valProp];
            opt.textContent = item[textProp];
            nativeSelect.appendChild(opt);
        });

        // Custom
        if(!customWrapper) return;
        const optionsContainer = customWrapper.querySelector('.select-options');
        const trigger = customWrapper.querySelector('.select-trigger');
        const triggerText = customWrapper.querySelector('.trigger-text');
        
        optionsContainer.innerHTML = '';
        trigger.classList.remove('disabled');
        triggerText.textContent = placeholder;

        // Search Input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'dropdown-search';
        searchInput.placeholder = 'Search...';
        optionsContainer.appendChild(searchInput);

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'option';
            div.dataset.value = item[valProp];
            div.textContent = item[textProp];
            optionsContainer.appendChild(div);
        });
    }

    function disableCustomSelect(customId, text) {
        const customWrapper = document.getElementById(customId);
        if(!customWrapper) return;
        const trigger = customWrapper.querySelector('.select-trigger');
        const triggerText = customWrapper.querySelector('.trigger-text');
        trigger.classList.add('disabled');
        triggerText.textContent = text;
    }

    // --- Init ---
    async function init() {
        showLoading();
        try {
            forcesData = await PoliceAPI.fetchForces();
            forcesData.sort((a, b) => a.name.localeCompare(b.name));
            availabilityData = await PoliceAPI.fetchAvailability();
            
            populateSelect('forceSelect', 'csForceSelect', forcesData, 'id', 'name', 'Select Jurisdiction');
            populateSelect('nhForceSelect', 'csNhForce', forcesData, 'id', 'name', 'Select Force');
            
            setupCustomDropdown('csForceSelect', 'forceSelect');
            setupCustomDropdown('csCrimeForce', 'crimeForceSelect');
            setupCustomDropdown('csCrimeNh', 'crimeNhSelect');
            setupCustomDropdown('csNhForce', 'nhForceSelect');
            setupCustomDropdown('csNhSelect', 'nhSelect');
            setupCustomDropdown('csSsForce', 'ssForceSelect');

            // Initial filtering for default dates
            filterForcesForDropdown('crimeDate', 'crimeForceSelect', 'csCrimeForce');
            filterForcesForDropdown('ssDate', 'ssForceSelect', 'csSsForce');
        } catch (error) {
            console.error("Failed to initialize app.", error);
            alert("Error connecting to the backend.");
        } finally {
            hideLoading();
        }
    }

    // --- Sidebar Navigation ---
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(t => {
                t.classList.remove('active');
                t.classList.remove('fade-in-up');
            });
            
            const targetBtn = e.target.closest('.nav-btn');
            targetBtn.classList.add('active');
            
            const targetPane = document.getElementById(targetBtn.dataset.target);
            targetPane.classList.add('active');
            setTimeout(() => targetPane.classList.add('fade-in-up'), 10);
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
            
            let detailsHtml = '';
            if (details) {
                detailsHtml += `<h3 class="text-accent" style="margin-bottom:1rem; font-size:1.5rem;">${details.name}</h3>`;
                if (details.description) detailsHtml += `<p style="color:var(--text-secondary); margin-bottom:1.5rem; line-height:1.6;">${details.description.replace(/(<([^>]+)>)/gi, "")}</p>`;
                if (details.url) detailsHtml += `<a href="${details.url}" target="_blank" class="primary-btn" style="text-decoration:none; display:inline-block;">Official Website &rarr;</a>`;
            }
            document.getElementById('forceDetailsContent').innerHTML = detailsHtml || '<div class="empty-state">No details found</div>';

            let officersHtml = '<ul class="info-list">';
            if (officers && Array.isArray(officers) && officers.length > 0) {
                officers.forEach(o => {
                    officersHtml += `<li class="info-item"><strong>${o.name}</strong><small style="color:var(--text-tertiary)">${o.rank}</small></li>`;
                });
            } else {
                officersHtml += '<li class="info-item" style="border:none;background:transparent;text-align:center;"><div class="empty-state">No command staff found</div></li>';
            }
            officersHtml += '</ul>';
            document.getElementById('officersContent').innerHTML = officersHtml;
        } catch (err) {
            console.error(err);
        } finally {
            hideLoading();
        }
    });

    // --- CRIMES TAB LOGIC ---
    document.getElementById('crimeDate').addEventListener('change', () => filterForcesForDropdown('crimeDate', 'crimeForceSelect', 'csCrimeForce'));

    document.getElementById('crimeForceSelect').addEventListener('change', async (e) => {
        const forceId = e.target.value;
        if(!forceId) return;
        
        showLoading();
        const nhs = await PoliceAPI.fetchNeighbourhoods(forceId);
        populateSelect('crimeNhSelect', 'csCrimeNh', nhs, 'id', 'name', 'Select Neighbourhood');
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
            alert("An error occurred or the area is too large.");
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
        populateSelect('nhSelect', 'csNhSelect', nhs, 'id', 'name', 'Select Neighbourhood');
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

        let teamHtml = '<ul class="info-list">';
        if(team && team.length > 0) {
            team.forEach(t => {
                teamHtml += `<li class="info-item"><strong>${t.name}</strong><br><small style="color:var(--text-tertiary)">${t.rank}</small></li>`;
            });
        } else {
            teamHtml += '<li><div class="empty-state">No team data found</div></li>';
        }
        teamHtml += '</ul>';
        document.getElementById('nhTeamContent').innerHTML = teamHtml;

        let pHtml = '<ul class="info-list">';
        if(priorities && priorities.length > 0) {
            priorities.forEach(p => {
                pHtml += `<li class="info-item" style="border-left-color: var(--accent-2)"><p style="font-size:0.9rem">${p.issue}</p></li>`;
            });
        } else {
            pHtml += '<li><div class="empty-state">No priorities listed</div></li>';
        }
        pHtml += '</ul>';
        document.getElementById('nhPrioritiesContent').innerHTML = pHtml;
    });

    // --- STOP & SEARCH TAB LOGIC ---
    document.getElementById('ssDate').addEventListener('change', () => filterForcesForDropdown('ssDate', 'ssForceSelect', 'csSsForce'));

    document.getElementById('btnFetchStops').addEventListener('click', async () => {
        const forceId = document.getElementById('ssForceSelect').value;
        const date = document.getElementById('ssDate').value;
        
        if (!forceId) return alert('Select a force');

        showLoading();
        const data = await PoliceAPI.fetchStopAndSearchAnalyticsByForce(forceId, date);
        hideLoading();

        if (!data || data.total_records === 0) {
            alert('No data found for this selection.');
            ['ssAgeChart', 'ssGenderChart', 'ssEthnicityChart', 'ssObjectChart', 'ssOutcomeChart', 'ssLegislationChart', 'ssTypeChart'].forEach(id => {
                if (activeCharts[id]) activeCharts[id].destroy();
            });
            document.getElementById('stripSearchCount').innerText = '0';
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
        const data = await PoliceAPI.fetchNationalRankings(date);
        hideLoading();

        if (!data || data.total_records === 0 || data.error) {
            alert(data?.error || 'No data found for this selection.');
            ['rankForceChart', 'rankEthnicityChart', 'rankAgeChart', 'rankObjectChart'].forEach(id => {
                if (activeCharts[id]) activeCharts[id].destroy();
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
        const h = Math.floor((index * (360 / total)) % 360);
        const s = Math.floor(70 + Math.random() * 30);
        const l = Math.floor(40 + Math.random() * 30);
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    function renderChart(canvasId, dataObj, label, type = 'bar') {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (activeCharts[canvasId]) activeCharts[canvasId].destroy();
        
        const labels = Object.keys(dataObj);
        const dataValues = Object.values(dataObj);
        const bgColors = labels.map((_, idx) => generatePortfolioColor(idx, labels.length));
        
        Chart.defaults.color = '#8b99ae';
        Chart.defaults.font.family = "'Space Mono', monospace";

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: type === 'doughnut', 
                    position: 'bottom',
                    labels: {
                        font: { size: 10 },
                        boxWidth: 12,
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            original.forEach(label => {
                                if (label.text.length > 22) {
                                    label.text = label.text.substring(0, 19) + '...';
                                }
                            });
                            return original;
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 13, 18, 0.9)',
                    titleColor: '#00F060',
                    bodyColor: '#f0f4f8',
                    borderColor: 'rgba(0, 240, 96, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            }
        };

        if (type === 'bar') {
            options.scales = {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { grid: { display: false } }
            };
        }

        activeCharts[canvasId] = new Chart(ctx, {
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
    function filterForcesForDropdown(dateInputId, selectId, customSelectId) {
        const dateVal = document.getElementById(dateInputId).value; 
        const select = document.getElementById(selectId);
        
        let availableForceIds = null;
        
        const dateInfo = availabilityData.find(d => d.date === dateVal);
        if (dateInfo && dateInfo['stop-and-search']) {
            availableForceIds = dateInfo['stop-and-search'];
        }

        let filteredForces = forcesData;
        if (availableForceIds) {
            filteredForces = forcesData.filter(f => availableForceIds.includes(f.id));
        } else if (dateInfo === undefined) {
            filteredForces = [];
        }
        
        const currentVal = select.value;
        populateSelect(selectId, customSelectId, filteredForces, 'id', 'name', 'Select Force');
        
        const customTriggerText = document.querySelector(`#${customSelectId} .trigger-text`);
        
        if (filteredForces.some(f => f.id === currentVal)) {
            select.value = currentVal;
            const match = filteredForces.find(f => f.id === currentVal);
            if (customTriggerText) customTriggerText.textContent = match.name;
        } else {
            select.value = "";
            select.dispatchEvent(new Event('change'));
        }
        
        if(filteredForces.length === 0) {
            disableCustomSelect(customSelectId, 'No data for this date');
        }
    }

    function showLoading() { loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { loadingOverlay.classList.add('hidden'); }

    init();
});
