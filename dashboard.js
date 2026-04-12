document.addEventListener('DOMContentLoaded', () => {
    // --- Dynamic User Session (gt_auth, gt_userName) ---
    const isAuth = localStorage.getItem('gt_auth') === 'true';
    const userName = localStorage.getItem('gt_userName');
    const userNameEl = document.querySelector('.user-name');
    const userAvatarEl = document.querySelector('.avatar');

    if (isAuth && userName) {
        if (userNameEl) userNameEl.textContent = userName;
        if (userAvatarEl) {
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff&rounded=true&bold=true`;
            userAvatarEl.src = avatarUrl;
        }
    } else {
        // Redirect to login if no active session
        window.location.href = 'index.html';
    }

    // --- Logout ---
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('gt_auth');
            localStorage.removeItem('gt_userName');
            window.location.href = 'index.html';
        });
    }

    // Basic Interactivity

    // Date Filters Active State
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Here you would typically fetch new data and update charts
        });
    });

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileClose = document.getElementById('mobile-close');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    mobileToggle.addEventListener('click', toggleSidebar);
    mobileClose.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // --- Notifications Toggle ---
    const notificationToggle = document.getElementById('notification-toggle');
    const notificationPanel = document.getElementById('notification-panel');

    notificationToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        notificationPanel.classList.toggle('active');
    });

    // Close notifications when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationPanel.contains(e.target) && !notificationToggle.contains(e.target)) {
            notificationPanel.classList.remove('active');
        }
    });

    // Prevent clicks inside panel from closing it
    notificationPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Mark as read functionality (dummy)
    const markReadBtn = document.querySelector('.mark-read-btn');
    const unreadItems = document.querySelectorAll('.notification-item.unread');
    const notificationBadge = document.querySelector('.notification-badge');

    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            unreadItems.forEach(item => {
                item.classList.remove('unread');
                const dot = item.querySelector('.unread-dot');
                if (dot) dot.remove();
            });
            if (notificationBadge) notificationBadge.style.display = 'none';
        });
    }

    // --- Navigation Routing ---
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');

    // Simple robust router based on text content since we don't have separate IDs on the nav
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            link.classList.add('active');

            const linkText = link.querySelector('span').textContent;

            // Hide all views
            viewSections.forEach(view => {
                view.classList.remove('active');
            });

            // Show appropriate view based on link clicked
            if (linkText === 'Dashboard') {
                document.getElementById('view-dashboard').classList.add('active');
            } else if (linkText === 'Business Mgmt') {
                document.getElementById('view-business-management').classList.add('active');
            }

            // On mobile, close sidebar after clicking
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });

    // Home Logo Routing
    const brandHomeBtn = document.getElementById('brand-home-btn');
    if (brandHomeBtn) {
        brandHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all links, add to dashboard
            navLinks.forEach(l => l.classList.remove('active'));
            const dashLink = Array.from(navLinks).find(l => l.querySelector('span').textContent === 'Dashboard');
            if (dashLink) dashLink.classList.add('active');

            // Hide all views, show dashboard
            viewSections.forEach(view => view.classList.remove('active'));
            document.getElementById('view-dashboard').classList.add('active');
        });
    }

    // --- Add Business Wizard Logic ---
    const viewAddBusiness = document.getElementById('view-add-business');
    const cancelAddBusiness = document.getElementById('cancel-add-business');

    // Routing from Empty State to Wizard
    document.querySelectorAll('.primary-action-btn').forEach(btn => {
        if (btn.textContent.includes("Add New Business")) {
            btn.addEventListener('click', () => {
                viewSections.forEach(view => view.classList.remove('active'));
                viewAddBusiness.classList.add('active');
                initWizardState();
            });
        }
    });

    // Cancel Wizard Router
    if (cancelAddBusiness) {
        cancelAddBusiness.addEventListener('click', () => {
            viewSections.forEach(view => view.classList.remove('active'));
            // Route back to Business Management
            document.getElementById('view-business-management').classList.add('active');
        });
    }

    // Wizard State Management (Compact Form)
    let wizardData = {
        type: null,
        needsMode: false,
        mode: null,
        name: ''
    };

    const wBackBtn = document.getElementById('wizard-back-btn');
    const wNextBtn = document.getElementById('wizard-next-btn');
    const businessNameInput = document.getElementById('businessName');
    const facilityModeGroup = document.getElementById('facility-mode-group');
    const facilityModeInputs = document.querySelectorAll('input[name="facilityMode"]');

    // Custom Dropdown Elements
    const typeSelector = document.getElementById('business-type-selector');
    const typeSearchInput = document.getElementById('type-search-input');
    const typeOptionsList = document.getElementById('type-options-list');
    const typeOptions = typeOptionsList.querySelectorAll('.option-item');
    const selectedTypeText = document.getElementById('selected-type-text');
    const selectedTypeIcon = document.getElementById('selected-type-icon');

    function initWizardState() {
        wizardData = { type: null, needsMode: false, mode: null, name: '' };

        // Reset Dropdown
        selectedTypeText.textContent = "Select a facility type...";
        selectedTypeIcon.className = "ph ph-squares-four text-muted";
        typeOptions.forEach(opt => opt.classList.remove('selected'));
        if (typeSearchInput) typeSearchInput.value = '';

        // Reset Mode
        facilityModeInputs.forEach(input => input.checked = false);
        facilityModeGroup.classList.add('hidden');

        // Reset Name
        if (businessNameInput) businessNameInput.value = '';

        updateWizardUI();
    }

    // --- Custom Dropdown Logic ---
    if (typeSelector) {
        const trigger = typeSelector.querySelector('.custom-select-trigger');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = typeSelector.classList.contains('open');
            // Close all other instances if they existed
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));

            if (!isOpen) {
                typeSelector.classList.add('open');
                if (typeSearchInput) {
                    typeSearchInput.focus();
                    typeSearchInput.value = '';
                    filterOptions(''); // Reset filter on open
                }
            }
        });

        // Search Filter
        if (typeSearchInput) {
            typeSearchInput.addEventListener('input', (e) => {
                filterOptions(e.target.value.toLowerCase());
            });
        }

        function filterOptions(searchTerm) {
            typeOptions.forEach(option => {
                const text = option.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    option.classList.remove('hidden');
                } else {
                    option.classList.add('hidden');
                }
            });
        }

        // Option Selection
        typeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();

                // Update UI state
                typeOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                const value = option.dataset.value;
                const needsMode = option.dataset.needsMode === "true";
                const iconClass = option.dataset.icon;
                const text = option.querySelector('span').textContent;

                selectedTypeText.textContent = text;
                selectedTypeIcon.className = `ph-fill ${iconClass}`;

                // Update internal state
                wizardData.type = value;
                wizardData.needsMode = needsMode;

                // Reset mode if type changes
                wizardData.mode = null;
                facilityModeInputs.forEach(input => input.checked = false);

                typeSelector.classList.remove('open');
                updateWizardUI();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!typeSelector.contains(e.target)) {
                typeSelector.classList.remove('open');
            }
        });
    }

    // --- Other Input Listeners ---

    facilityModeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            wizardData.mode = e.target.value;
            updateWizardUI();
        });
    });

    if (businessNameInput) {
        businessNameInput.addEventListener('input', (e) => {
            wizardData.name = e.target.value.trim();
            updateWizardUI();
        });
    }

    // --- State Validation & Visibility updates ---

    function updateWizardUI() {
        // Toggle Facility Mode Visibility
        if (wizardData.type && wizardData.needsMode) {
            facilityModeGroup.classList.remove('hidden');
        } else {
            facilityModeGroup.classList.add('hidden');
        }

        // Validate complete step 1 data
        let isValid = false;
        if (wizardData.type) {
            if (wizardData.needsMode) {
                // Needs mode selected and a valid name
                isValid = wizardData.mode !== null && wizardData.name.length >= 3;
            } else {
                // Only needs a valid name
                isValid = wizardData.name.length >= 3;
            }
        }

        if (wBackBtn) wBackBtn.disabled = true; // Step 1 is the first step
        if (wNextBtn) wNextBtn.disabled = !isValid;
    }

    // --- Toast Notification Logic ---
    function showToast(message, type = 'success') {
        const wizardContainer = document.querySelector('.wizard-container');
        let container = wizardContainer.querySelector('.toast-container');

        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            wizardContainer.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="ph-fill ph-check-circle"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Remove toast after animation
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 3000); // Match CSS animation duration
    }

    // Next Button Handler (Moving to Step 2)
    if (wNextBtn) {
        wNextBtn.addEventListener('click', () => {
            console.log("Saving Step 1 Data:", wizardData);
            showToast("Changes saved");

            // For now, just show the toast. In a real app we'd move to step 2 here.
            // alert(`COMPACT STEP 1 COMPLETE!\nType: ${wizardData.type}\nMode: ${wizardData.mode || 'N/A'}\nName: ${wizardData.name}`);
        });
    }

    // --- Chart.js Implementations ---

    // Common Chart Config Defaults for Premium Look
    Chart.defaults.color = '#9ca3af'; // text-secondary
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 10, 12, 0.9)';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    // 1. Revenue Trends Line Chart
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');

    // Create Gradient for Line Chart
    const gradientRevenue = ctxRevenue.createLinearGradient(0, 0, 0, 400);
    gradientRevenue.addColorStop(0, 'rgba(99, 102, 241, 0.5)'); // Primary color with opacity
    gradientRevenue.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            datasets: [{
                label: 'Revenue ($)',
                data: [12500, 14200, 13800, 18500, 17200, 21000, 23500, 22400, 25600, 28400],
                borderColor: '#6366f1',
                backgroundColor: gradientRevenue,
                borderWidth: 3,
                pointBackgroundColor: '#0a0a0c',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide as we have single dataset and external title
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function (value) {
                            return '$' + value / 1000 + 'k';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });

    // 2. Booking Status Doughnut Chart
    const ctxStatus = document.getElementById('statusChart').getContext('2d');

    new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'In Progress', 'Cancelled'],
            datasets: [{
                data: [55, 25, 15, 5],
                backgroundColor: [
                    '#10b981', // Emerald
                    '#f59e0b', // Amber
                    '#6366f1', // Indigo
                    '#ef4444'  // Red
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // Make ring thinner
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }
        }
    });
});
