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
        window.location.href = '/';
    }

    // --- Logout ---
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('gt_auth');
            localStorage.removeItem('gt_userName');
            window.location.href = '/';
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

    function navigateToView(viewId, updateUrl = true) {
        // Hide all views
        viewSections.forEach(view => {
            view.classList.remove('active');
        });

        // Determine link text for active state
        let linkText = 'Dashboard';
        if (viewId === 'view-business-management') {
            linkText = 'Business Mgmt';
        }

        // Show appropriate view
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');

        // Execute view-specific logic
        if (viewId === 'view-business-management') {
            fetchBusinesses();
        }

        // Update nav links active state
        navLinks.forEach(l => {
            l.classList.toggle('active', l.querySelector('span').textContent === linkText);
        });

        // Update URL
        if (updateUrl) {
            const url = new URL(window.location);
            const tabName = viewId.replace('view-', '');
            url.searchParams.set('tab', tabName);
            window.history.pushState({ viewId }, '', url);
        }

        // On mobile, close sidebar
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');
            if (sidebar && overlay && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        }
    }

    // Expose for other actions (like cancel/save) if needed
    window.navigateToView = navigateToView;

    // Handle clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const linkText = link.querySelector('span').textContent;
            if (linkText === 'Dashboard') {
                navigateToView('view-dashboard');
            } else if (linkText === 'Business Mgmt') {
                navigateToView('view-business-management');
            }
        });
    });

    // Home Logo Routing
    const brandHomeBtn = document.getElementById('brand-home-btn');
    if (brandHomeBtn) {
        brandHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToView('view-dashboard');
        });
    }

    // Initialize from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'business-management') {
        navigateToView('view-business-management', false);
    } else if (tabParam === 'add-business') {
        navigateToView('view-add-business', false);
    } else {
        navigateToView('view-dashboard', false);
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.viewId) {
            navigateToView(e.state.viewId, false);
        } else {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab === 'business-management') {
                navigateToView('view-business-management', false);
            } else if (tab === 'add-business') {
                navigateToView('view-add-business', false);
            } else {
                navigateToView('view-dashboard', false);
            }
        }
    });

    // ═══════════════════════════════════════════════════
    //  ADD BUSINESS WIZARD — Full Logic
    // ═══════════════════════════════════════════════════
    const viewAddBusiness   = document.getElementById('view-add-business');
    const cancelAddBusiness = document.getElementById('cancel-add-business');
    const launchBtn         = document.getElementById('launch-business-btn');
    const businessNameInput = document.getElementById('businessName');

    // Type selector (in sub-step A)
    const typeSelector      = document.getElementById('business-type-selector');
    const typeSearchInput   = document.getElementById('type-search-input');
    const typeOptionsList   = document.getElementById('type-options-list');
    const typeOptions       = typeOptionsList ? typeOptionsList.querySelectorAll('.option-item') : [];
    const selectedTypeText  = document.getElementById('selected-type-text');
    const selectedTypeIcon  = document.getElementById('selected-type-icon');
    const facilityModeGroup = document.getElementById('facility-mode-group');
    const facilityModeInputs= document.querySelectorAll('input[name="facilityMode"]');

    // Sub-step elements
    const substepA          = document.getElementById('builder-substep-a');
    const substepB          = document.getElementById('builder-substep-b');
    const substepANext      = document.getElementById('substep-a-next');
    const substepBBack      = document.getElementById('substep-b-back');
    const substepBTitle     = document.getElementById('substep-b-title');
    const saveTypeBtn       = document.getElementById('save-business-type-btn');
    const savedTypesList    = document.getElementById('saved-types-list');
    const addAnotherBtn     = document.getElementById('add-another-type-btn');
    const builderPanel      = document.getElementById('type-builder-panel');
    // Advanced Pricing
    const btnAddWknd        = document.getElementById('btn-add-weekend');
    const btnAddPeak        = document.getElementById('btn-add-peak');

    // Amenity search & custom modal
    const amenitySearch     = document.getElementById('amenity-search');
    const customTrigger     = document.getElementById('custom-amenity-trigger');
    const customModal       = document.getElementById('custom-amenity-modal');
    const customNameInp     = document.getElementById('custom-amenity-name');
    const addCustomBtn      = document.getElementById('add-custom-amenity-btn');
    const closeCustom       = document.getElementById('close-custom-modal');
    const tierWknd          = document.getElementById('tier-weekend');
    const tierPeak          = document.getElementById('tier-peak');
    const btnRemoveWknd     = document.getElementById('btn-remove-weekend');
    const btnRemovePeak     = document.getElementById('btn-remove-peak');

    if (btnAddWknd) {
        btnAddWknd.addEventListener('click', () => {
            if (tierWknd) tierWknd.classList.remove('hidden');
            document.getElementById('tier-weekend-edit').classList.remove('hidden');
            document.getElementById('tier-weekend-summary').classList.add('hidden');
            btnAddWknd.style.display = 'none';
        });
    }

    if (btnAddPeak) {
        btnAddPeak.addEventListener('click', () => {
            if (tierPeak) tierPeak.classList.remove('hidden');
            document.getElementById('tier-peak-edit').classList.remove('hidden');
            document.getElementById('tier-peak-summary').classList.add('hidden');
            btnAddPeak.style.display = 'none';
        });
    }

    // Weekend Actions
    const closeWeekend = () => {
        if (tierWknd) tierWknd.classList.add('hidden');
        if (btnAddWknd) btnAddWknd.style.display = 'inline-flex';
        const fwp = document.getElementById('facilityWeekendPrice');
        if (fwp) fwp.value = '';
    };

    document.getElementById('btn-remove-weekend')?.addEventListener('click', closeWeekend);
    document.getElementById('btn-cancel-weekend-edit')?.addEventListener('click', () => {
        const val = document.getElementById('facilityWeekendPrice')?.value;
        if (!val) closeWeekend();
        else {
            document.getElementById('tier-weekend-edit').classList.add('hidden');
            document.getElementById('tier-weekend-summary').classList.remove('hidden');
        }
    });
    document.getElementById('btn-done-weekend')?.addEventListener('click', () => {
        const val = document.getElementById('facilityWeekendPrice')?.value;
        if (!val) closeWeekend();
        else {
            document.getElementById('val-weekend-price').textContent = `₹${val}`;
            document.getElementById('tier-weekend-edit').classList.add('hidden');
            document.getElementById('tier-weekend-summary').classList.remove('hidden');
        }
    });
    document.getElementById('btn-edit-weekend')?.addEventListener('click', () => {
        document.getElementById('tier-weekend-summary').classList.add('hidden');
        document.getElementById('tier-weekend-edit').classList.remove('hidden');
    });

    // Peak Actions
    const closePeak = () => {
        if (tierPeak) tierPeak.classList.add('hidden');
        if (btnAddPeak) btnAddPeak.style.display = 'inline-flex';
        const fpp = document.getElementById('facilityPeakPrice');
        if (fpp) fpp.value = '';
    };

    document.getElementById('btn-remove-peak')?.addEventListener('click', closePeak);
    document.getElementById('btn-cancel-peak-edit')?.addEventListener('click', () => {
        const val = document.getElementById('facilityPeakPrice')?.value;
        if (!val) closePeak();
        else {
            document.getElementById('tier-peak-edit').classList.add('hidden');
            document.getElementById('tier-peak-summary').classList.remove('hidden');
        }
    });
    document.getElementById('btn-done-peak')?.addEventListener('click', () => {
        const val = document.getElementById('facilityPeakPrice')?.value;
        if (!val) closePeak();
        else {
            document.getElementById('val-peak-price').textContent = `₹${val}`;
            document.getElementById('val-peak-time').textContent = `${document.getElementById('facilityPeakStart').value} - ${document.getElementById('facilityPeakEnd').value}`;
            document.getElementById('tier-peak-edit').classList.add('hidden');
            document.getElementById('tier-peak-summary').classList.remove('hidden');
        }
    });
    document.getElementById('btn-edit-peak')?.addEventListener('click', () => {
        document.getElementById('tier-peak-summary').classList.add('hidden');
        document.getElementById('tier-peak-edit').classList.remove('hidden');
    });

    const bizStatusToggle   = document.getElementById('business-status-toggle');
    const bizStatusText     = document.getElementById('business-status-text');
    const facStatusToggle   = document.getElementById('facility-status-toggle');
    const facStatusText     = document.getElementById('facility-status-text');

    if (bizStatusToggle) {
        bizStatusToggle.addEventListener('change', () => {
            const isActive = bizStatusToggle.checked;
            bizStatusText.textContent = isActive ? 'Active' : 'Inactive';
            bizStatusText.className = `status-tiny ${isActive ? 'active' : 'inactive'}`;
        });
    }

    if (facStatusToggle) {
        facStatusToggle.addEventListener('change', () => {
            const isActive = facStatusToggle.checked;
            facStatusText.textContent = isActive ? 'Active' : 'Inactive';
            facStatusText.className = `status-tiny ${isActive ? 'active' : 'inactive'}`;
        });
    }

    // Amenities Selection
    const amenityChips = document.querySelectorAll('.amenity-chip');
    amenityChips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
        });
    });

    // ── Dynamic Amenities Picker Options ──
    const defaultAmenitiesList = [
        { id: 'wifi', label: 'WiFi', icon: 'ph-wifi-high' },
        { id: 'parking', label: 'Parking', icon: 'ph-park' },
        { id: 'water', label: 'Drinking Water', icon: 'ph-drop' },
        { id: 'changing_room', label: 'Changing Room', icon: 'ph-door' },
        { id: 'shower', label: 'Shower', icon: 'ph-shower' },
        { id: 'lights', label: 'Floodlights', icon: 'ph-lightbulb' },
        { id: 'locker', label: 'Lockers', icon: 'ph-lock' },
        { id: 'first_aid', label: 'First Aid', icon: 'ph-first-aid' },
        { id: 'cctv', label: 'CCTV', icon: 'ph-video-camera' },
        { id: 'cafe', label: 'Cafeteria', icon: 'ph-coffee' },
        { id: 'ac', label: 'Air Conditioning', icon: 'ph-snowflake' },
        { id: 'power_backup', label: 'Power Backup', icon: 'ph-plug' }
    ];

    let customAmenities = [];
    let selectedAmenities = [];

    let currentStep = 1;
    let currentTypeDraft = { type: null, label: null, icon: null, needsMode: false, mode: null };
    let savedBusinessTypes = [];          // array of saved type objects
    let businessName = '';
    let editingBusinessId = null;

    // ── Route: empty-state & top-bar "Add New Business" → wizard ──
    const openAddWizard = () => {
        editingBusinessId = null;
        navigateToView('view-add-business');
        initWizardState();
        // Update header title if it was changed by edit
        const wizardTitle = viewAddBusiness.querySelector('.page-title');
        if (wizardTitle) wizardTitle.textContent = 'Add New Business';
    };

    document.querySelectorAll('.primary-action-btn').forEach(btn => {
        if (btn.textContent.includes('Add New Business')) {
            btn.addEventListener('click', openAddWizard);
        }
    });

    const addBizTopBtn = document.getElementById('add-biz-top-btn');
    if (addBizTopBtn) {
        addBizTopBtn.addEventListener('click', openAddWizard);
    }

    // ── Cancel ──
    if (cancelAddBusiness) {
        cancelAddBusiness.addEventListener('click', () => {
            const hasChanges = businessName.trim().length > 0 || 
                               savedBusinessTypes.length > 0 || 
                               currentTypeDraft.type !== null;
            
            if (hasChanges) {
                const confirmed = window.confirm("You have unsaved changes. Are you sure you want to discard them?");
                if (!confirmed) return;
            }

            navigateToView('view-business-management');
        });
    }

    // ══════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════
    function initWizardState() {
        businessName       = '';
        savedBusinessTypes = [];
        currentTypeDraft   = { type: null, label: null, icon: null, needsMode: false, mode: null };

        if (businessNameInput) businessNameInput.value = '';
        if (bizStatusToggle) {
            bizStatusToggle.checked = true;
            bizStatusText.textContent = 'Active';
            bizStatusText.className = 'status-tiny active';
        }
        resetSubstepA();
        resetSubstepBFields();

        if (savedTypesList) savedTypesList.innerHTML = '';
        if (addAnotherBtn) addAnotherBtn.classList.add('hidden');
        if (builderPanel) builderPanel.classList.remove('hidden');

        updateLaunchBtn();
    }

    function resetSubstepA() {
        currentTypeDraft = { type: null, label: null, icon: null, needsMode: false, mode: null };
        if (selectedTypeText) selectedTypeText.textContent = 'Select a facility type...';
        if (selectedTypeIcon) selectedTypeIcon.className = 'ph ph-squares-four text-muted';
        typeOptions.forEach(o => o.classList.remove('selected'));
        if (typeSearchInput) typeSearchInput.value = '';
        facilityModeInputs.forEach(i => i.checked = false);
        if (facilityModeGroup) facilityModeGroup.classList.add('hidden');
        if (facStatusToggle) {
            facStatusToggle.checked = true;
            facStatusText.textContent = 'Active';
            facStatusText.className = 'status-tiny active';
        }
        if (substepANext) substepANext.disabled = true;

        // Show A, hide B
        if (substepA) substepA.classList.remove('hidden');
        if (substepB) substepB.classList.add('hidden');
    }

    function resetSubstepBFields() {
        // Hours: uncheck Sunday, re-check all others
        document.querySelectorAll('.day-row').forEach(row => {
            const cb = row.querySelector('.day-check');
            if (!cb) return;
            const day = row.dataset.day;
            cb.checked = day !== 'Sunday';
            syncDayRow(row);
        });
        // Amenity chips reset
        selectedAmenities = [];
        customAmenities   = [];
        if (amenitySearch) amenitySearch.value = '';
        renderAmenities();
        // Fields
        const price = document.getElementById('facilityPrice'); if (price) price.value = '';
        const wprice = document.getElementById('facilityWeekendPrice'); if (wprice) wprice.value = '';
        const pprice = document.getElementById('facilityPeakPrice'); if (pprice) pprice.value = '';

        if (tierWknd) { tierWknd.classList.add('hidden'); if(btnAddWknd) btnAddWknd.style.display = 'inline-flex'; }
        if (tierPeak) { tierPeak.classList.add('hidden'); if(btnAddPeak) btnAddPeak.style.display = 'inline-flex'; }

        const fd = document.getElementById('facilityCapacity'); if (fd) fd.value = '';
        const desc = document.getElementById('facilityDesc');  if (desc) desc.value = '';
        const dc = document.getElementById('desc-char-count'); if (dc) { dc.textContent = '0 / 300'; dc.style.color = ''; }
        const ph = document.getElementById('facilityPhone');   if (ph) ph.value = '';
        const wb = document.getElementById('facilityWebsite'); if (wb) wb.value = '';
    }

    function updateLaunchBtn() {
        if (!launchBtn) return;
        const isNameValid = businessName.length >= 3;
        const hasTypes = savedBusinessTypes.length > 0;
        launchBtn.disabled = !(isNameValid && hasTypes);
    }

    function fetchBusinesses() {
        const token = localStorage.getItem('gt_token');
        if (!token) return;

        fetch('/businesses', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderBusinessesList(data.businesses);
            }
        })
        .catch(err => {
            console.error('Error fetching businesses:', err);
            showToast('Failed to load businesses. Please check your connection.');
        });
    }

    function renderBusinessesList(businesses) {
        const listGrid = document.getElementById('businesses-list-grid');
        const emptyState = document.getElementById('business-empty-state');
        
        if (!listGrid) return;

        // Hide empty state if management view is active, as we now have the "Add" card
        if (emptyState) emptyState.classList.add('hidden');
        listGrid.classList.remove('hidden');
        listGrid.innerHTML = '';

        businesses.forEach(biz => {
            const card = document.createElement('div');
            card.className = 'business-card';
            
            const types = biz.facility_types ? biz.facility_types.split(',') : [];
            const typeChips = types.map(t => `<span class="biz-type-chip">${t.replace(/_/g, ' ')}</span>`).join('');

            card.innerHTML = `
                <div class="biz-card-header">
                    <div class="biz-icon-wrapper">
                        <i class="ph-fill ph-storefront"></i>
                    </div>
                    <div class="biz-badge ${biz.status === 'inactive' ? 'badge-inactive' : ''}">${biz.status === 'active' ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="biz-card-body">
                    <div class="biz-owner">
                        <i class="ph ph-user"></i> ${biz.owner_name || 'Business Owner'}
                    </div>
                    <div class="biz-name">${biz.name}</div>
                    <div class="biz-meta-info">
                        <div class="meta-item">
                            <i class="ph ph-calendar"></i>
                            <span>Joined ${new Date(biz.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <i class="ph ph-stack"></i>
                            <span>${biz.facility_count || 0} Facility Types</span>
                        </div>
                    </div>
                    <div class="biz-types-grid">
                        ${typeChips}
                    </div>
                </div>
                <div class="biz-card-footer">
                    <div class="biz-actions">
                        <button class="biz-btn biz-btn-manage edit-biz-btn" data-id="${biz.id}">
                            <i class="ph ph-pencil-simple"></i> Edit
                        </button>
                        <button class="biz-btn biz-btn-view view-biz-btn" data-id="${biz.id}">
                            <i class="ph ph-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
            listGrid.appendChild(card);
        });

        // 🟢 Append Add New Business Card at the end
        const addCard = document.createElement('div');
        addCard.className = 'business-card add-biz-card';
        addCard.innerHTML = `
            <div class="add-icon"><i class="ph ph-plus"></i></div>
            <span>Add New Business</span>
        `;
        addCard.addEventListener('click', openAddWizard);
        listGrid.appendChild(addCard);

        // Add Listeners
        listGrid.querySelectorAll('.edit-biz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editBusiness(btn.getAttribute('data-id'));
            });
        });
        listGrid.querySelectorAll('.view-biz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewBusiness(btn.getAttribute('data-id'));
            });
        });
    }

    const viewModal = document.getElementById('biz-view-modal');
    const closeModal = document.getElementById('close-modal');

    if (closeModal) {
        closeModal.addEventListener('click', () => viewModal.classList.add('hidden'));
    }

    function viewBusiness(id) {
        const token = localStorage.getItem('gt_token');
        fetch(`/businesses/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const biz = data.business;
                document.getElementById('modal-biz-name').textContent = biz.name;
                
                const typesGrid = document.getElementById('modal-biz-types');
                typesGrid.innerHTML = biz.facilities.map(f => {
                    const ams = f.amenities && f.amenities.length > 0 
                        ? `<div class="modal-amenities-list">${f.amenities.map(a => `<span class="mini-badge">${a.replace(/_/g, ' ')}</span>`).join('')}</div>`
                        : '';
                    
                    return `
                        <div class="detail-item-card">
                            <div class="detail-item-header">
                                <i class="${f.icon || 'ph ph-buildings'}"></i>
                                <span>${f.label || f.type}</span>
                            </div>
                            ${ams}
                        </div>
                    `;
                }).join('');

                const contact = document.getElementById('modal-biz-contact');
                // Use first facility's contact info as a fallback
                const firstFac = biz.facilities[0];
                contact.textContent = firstFac ? `Contact: ${firstFac.phone || 'N/A'} | Website: ${firstFac.website || 'N/A'}` : 'No contact info available.';

                viewModal.classList.remove('hidden');
            } else {
                showToast('Error loading business: ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Failed to view business.');
        });
    }

    function editBusiness(id) {
        const token = localStorage.getItem('gt_token');
        fetch(`/businesses/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const biz = data.business;
                editingBusinessId = biz.id;
                
                // Show Wizard
                navigateToView('view-add-business');
                
                // Initialize State
                initWizardState();
                businessName = biz.name;
                if (businessNameInput) businessNameInput.value = biz.name;
                
                if (bizStatusToggle) {
                    const isActive = biz.status !== 'inactive';
                    bizStatusToggle.checked = isActive;
                    bizStatusText.textContent = isActive ? 'Active' : 'Inactive';
                    bizStatusText.className = `status-tiny ${isActive ? 'active' : 'inactive'}`;
                }

                // Load Facilities
                savedBusinessTypes = biz.facilities;
                
                // Show 'General' tab by default
                performWizardNav('general');

                // Update UI
                const wizardTitle = viewAddBusiness.querySelector('.page-title');
                if (wizardTitle) wizardTitle.textContent = 'Edit Business';
                updateLaunchBtn();
                
                attachChangeTrackers();
            } else {
                showToast('Error loading business: ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Failed to load business details.');
        });
    }

    if (launchBtn) {
        launchBtn.addEventListener('click', () => {
            const token = localStorage.getItem('gt_token');
            if (!token) {
                showToast('Session expired. Please login again.');
                return;
            }

            const payload = {
                name: businessName,
                status: bizStatusToggle && bizStatusToggle.checked ? 'active' : 'inactive',
                facilities: savedBusinessTypes
            };

            launchBtn.disabled = true;
            const btnText = launchBtn.querySelector('.btn-text');
            const originalText = btnText.textContent;
            btnText.textContent = editingBusinessId ? 'Updating Business...' : 'Saving Business...';

            const url = editingBusinessId ? `/businesses/${editingBusinessId}` : '/businesses';
            const method = editingBusinessId ? 'PUT' : 'POST';

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('Business setup saved successfully!');
                    
                    // Reset local state
                    businessName = '';
                    if (businessNameInput) businessNameInput.value = '';
                    savedBusinessTypes = [];
                    if (savedTypesList) savedTypesList.innerHTML = '';
                    resetSubstepA();
                    
                    // Refresh the list
                    fetchBusinesses();

                    // After saving, route back to main management view
                    setTimeout(() => {
                        navigateToView('view-business-management');
                    }, 1000);
                } else {
                    showToast('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error('Error saving business:', err);
                showToast('Server error while saving.');
            })
            .finally(() => {
                launchBtn.disabled = false;
                btnText.textContent = originalText;
            });
        });
    }

    // Initial fetch
    fetchBusinesses();

    // ── Step 1: Name input ──
    if (businessNameInput) {
        businessNameInput.addEventListener('input', e => {
            businessName = e.target.value.trim();
            updateLaunchBtn();
        });
    }

    // ══════════════════════════════════════════════════
    //  SUB-STEP A: Type selector & mode picker
    // ══════════════════════════════════════════════════
    if (typeSelector) {
        const trigger = typeSelector.querySelector('.custom-select-trigger');

        trigger.addEventListener('click', e => {
            e.stopPropagation();
            const isOpen = typeSelector.classList.contains('open');
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            if (!isOpen) {
                typeSelector.classList.add('open');
                if (typeSearchInput) { typeSearchInput.focus(); typeSearchInput.value = ''; filterTypeOptions(''); }
            }
        });

        if (typeSearchInput) {
            typeSearchInput.addEventListener('input', e => filterTypeOptions(e.target.value.toLowerCase()));
        }

        function filterTypeOptions(term) {
            typeOptions.forEach(o => {
                o.classList.toggle('hidden', !o.textContent.toLowerCase().includes(term));
            });
        }

        typeOptions.forEach(option => {
            option.addEventListener('click', e => {
                e.stopPropagation();
                typeOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');

                currentTypeDraft.type     = option.dataset.value;
                currentTypeDraft.label    = option.querySelector('span').textContent;
                currentTypeDraft.icon     = option.dataset.icon;
                currentTypeDraft.needsMode= option.dataset.needsMode === 'true';
                currentTypeDraft.mode     = null;
                facilityModeInputs.forEach(i => i.checked = false);

                selectedTypeText.textContent = currentTypeDraft.label;
                selectedTypeIcon.className   = `ph-fill ${currentTypeDraft.icon}`;

                if (currentTypeDraft.needsMode) {
                    facilityModeGroup.classList.remove('hidden');
                } else {
                    facilityModeGroup.classList.add('hidden');
                }

                typeSelector.classList.remove('open');
                updateSubstepANext();
            });
        });

        document.addEventListener('click', e => {
            if (!typeSelector.contains(e.target)) typeSelector.classList.remove('open');
        });
    }

    facilityModeInputs.forEach(input => {
        input.addEventListener('change', e => {
            currentTypeDraft.mode = e.target.value;
            updateSubstepANext();
        });
    });

    function updateSubstepANext() {
        if (!substepANext) return;
        const valid = currentTypeDraft.type &&
            (!currentTypeDraft.needsMode || currentTypeDraft.mode !== null);
        substepANext.disabled = !valid;
    }

    // Sub-step A → B
    if (substepANext) {
        substepANext.addEventListener('click', () => {
            console.log("Substep A Next button clicked!");
            // Build title for sub-step B
            let title = currentTypeDraft.label;
            if (currentTypeDraft.mode) {
                const modeLabels = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & Outdoor' };
                title += ` — ${modeLabels[currentTypeDraft.mode]}`;
            }
            if (substepBTitle) substepBTitle.textContent = `Configure: ${title}`;

            console.log("Calling resetSubstepBFields...");
            // Reset B fields for new type
            resetSubstepBFields();

            console.log("Toggling classes for substepA and substepB...");
            substepA.classList.add('hidden');
            substepB.classList.remove('hidden');
            console.log("Transitions complete.");
        });
    }

    // Sub-step B → A (back)
    if (substepBBack) {
        substepBBack.addEventListener('click', () => {
            substepB.classList.add('hidden');
            substepA.classList.remove('hidden');
        });
    }

    // ══════════════════════════════════════════════════
    //  SAVE THIS BUSINESS TYPE
    // ══════════════════════════════════════════════════
    if (saveTypeBtn) {
        saveTypeBtn.addEventListener('click', () => {
            // Collect hours
            const hours = {};
            document.querySelectorAll('.day-row').forEach(row => {
                const cb = row.querySelector('.day-check');
                hours[row.dataset.day] = {
                    open:    cb.checked,
                    openTime:  row.querySelector('.open-time')?.value,
                    closeTime: row.querySelector('.close-time')?.value
                };
            });

            // Collect amenities
            const allPossible = [...defaultAmenitiesList, ...customAmenities];
            const amenities = allPossible
                .filter(a => selectedAmenities.includes(a.id))
                .map(a => a.label);

            const savedType = {
                ...currentTypeDraft,
                status: facStatusToggle && facStatusToggle.checked ? 'active' : 'inactive',
                hours,
                amenities,
                price:        document.getElementById('facilityPrice')?.value || '',
                weekendPrice: tierWknd && !tierWknd.classList.contains('hidden') ? document.getElementById('facilityWeekendPrice')?.value : null,
                peakPrice:    tierPeak && !tierPeak.classList.contains('hidden') ? document.getElementById('facilityPeakPrice')?.value : null,
                peakStart:    tierPeak && !tierPeak.classList.contains('hidden') ? document.getElementById('facilityPeakStart')?.value : null,
                peakEnd:      tierPeak && !tierPeak.classList.contains('hidden') ? document.getElementById('facilityPeakEnd')?.value : null,
                capacity:     document.getElementById('facilityCapacity')?.value || '',
                description:  document.getElementById('facilityDesc')?.value || '',
                phone:        document.getElementById('facilityPhone')?.value || '',
                website:      document.getElementById('facilityWebsite')?.value || ''
            };

            if (activeWizardTab === 'new') {
                savedBusinessTypes.push(savedType);
            } else if (typeof activeWizardTab === 'number') {
                savedBusinessTypes[activeWizardTab] = savedType;
            }

            setWizardChanged(false);
            updateLaunchBtn();
            showToast(`"${savedType.label}" added!`);

            // After saving a service, auto-navigate back to services list
            performWizardNav('services-list');
        });
    }

    // ── NEW: Side Navigation Logic ──
    let activeWizardTab = 'general'; // 'general', 'services-list', or index/new
    let wizardTransitionTarget = null;
    let wizardFormHasChanges = false;

    // Track changes globally in the wizard
    function setWizardChanged(changed) {
        wizardFormHasChanges = changed;
        const saveBtn = document.getElementById('save-business-type-btn');
        if (saveBtn) {
            saveBtn.classList.toggle('has-changes', changed);
        }
    }

    // Attach listeners to all inputs to track changes
    function attachChangeTrackers() {
        const inputs = document.querySelectorAll('.wizard-main input, .wizard-main textarea, .wizard-main select');
        inputs.forEach(input => {
            input.addEventListener('input', () => setWizardChanged(true));
            input.addEventListener('change', () => setWizardChanged(true));
        });
    }

    function performWizardNav(target) {
        activeWizardTab = target;
        unsavedModal?.classList.add('hidden');
        setWizardChanged(false);

        const wizardHeader = document.querySelector('#view-add-business .page-header');
        const generalSection = document.getElementById('wizard-section-general');
        const servicesListSection = document.getElementById('wizard-section-services-list');
        const serviceEditSection = document.getElementById('wizard-section-service-edit');

        // Hide all
        [generalSection, servicesListSection, serviceEditSection].forEach(s => {
            if (s) {
                s.classList.add('hidden-section');
                s.classList.remove('active-wizard-section');
            }
        });

        // Header visibility toggle removed to prevent jumpy layout shifts

        if (target === 'general') {
            currentSection = generalSection;
            // Hide Save Business on General Info tab
            document.getElementById('save-business-btn')?.classList.add('hidden');
        } else if (target === 'services-list') {
            currentSection = servicesListSection;
            renderServicesGrid();
            // Show Save Business button on the listing page
            const saveBizBtn = document.getElementById('save-business-btn');
            if (saveBizBtn) {
                saveBizBtn.classList.remove('hidden');
                const btnText = saveBizBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = editingBusinessId ? 'Update Business' : 'Save Business';
            }
        } else if (typeof target === 'number' || target === 'new') {
            currentSection = serviceEditSection;
            const isEditing = typeof target === 'number';
            // Toggle Save / Update label
            const saveBtn = document.getElementById('save-business-type-btn');
            const saveBtnText = saveBtn?.querySelector('.btn-text');
            if (saveBtnText) saveBtnText.textContent = isEditing ? 'Update' : 'Save';
            // Hide Save Business when entering the edit form or general info
            document.getElementById('save-business-btn')?.classList.add('hidden');
            if (target === 'new') {
                resetSubstepA();
            } else {
                const type = savedBusinessTypes[target];
                if (type) loadTypeIntoBuilder(type);
            }
        }

        if (currentSection) {
            currentSection.classList.remove('hidden-section');
            currentSection.classList.add('active-wizard-section');
        }
        
        // Update sidebar highlights and sub-menu
        renderWizardSidebar();
    }

    function renderWizardSidebar() {
        const subList = document.getElementById('sidebar-sub-services');
        if (subList) {
            subList.innerHTML = '';
            savedBusinessTypes.forEach((type, index) => {
                const item = document.createElement('div');
                item.className = `sidebar-sub-item ${activeWizardTab === index ? 'active' : ''}`;
                item.innerHTML = `<i class="ph ${type.icon || 'ph-dot'}"></i><span>${type.label}</span>`;
                item.onclick = () => attemptWizardNav(index);
                subList.appendChild(item);
            });
        }

        document.querySelectorAll('.wizard-sidebar .step-item').forEach(item => {
            const step = item.dataset.step;
            const isServicesActive = (step === 'services-list' && (typeof activeWizardTab === 'number' || activeWizardTab === 'new' || activeWizardTab === 'services-list'));
            const isGeneralActive = (step === 'general' && activeWizardTab === 'general');
            
            item.classList.toggle('active', isGeneralActive || isServicesActive);
        });
    }

    function renderServicesGrid() {
        const grid = document.getElementById('services-grid-view');
        if (!grid) return;
        grid.innerHTML = '';

        savedBusinessTypes.forEach((type, index) => {
            const card = document.createElement('div');
            card.className = 'business-card service-card';
            const openDays = Object.values(type.hours || {}).filter(h => h.open).length;

            card.innerHTML = `
                <div class="biz-card-header">
                    <div class="biz-icon-wrapper"><i class="ph-fill ${type.icon || 'ph-buildings'}"></i></div>
                    <div class="biz-badge ${type.status === 'inactive' ? 'badge-inactive' : ''}">${type.status === 'active' ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="biz-card-body">
                    <div class="biz-name">${type.label}</div>
                    <div class="biz-meta-info">
                        <div class="meta-item"><i class="ph ph-calendar-check"></i><span>${openDays} Open Days</span></div>
                        <div class="meta-item"><i class="ph ph-tag"></i><span>₹${type.price || 0}/hr base</span></div>
                    </div>
                </div>
                <div class="biz-card-footer">
                    <div class="biz-actions">
                        <button type="button" class="biz-btn biz-btn-manage edit-service-btn"><i class="ph ph-pencil-simple"></i> Edit</button>
                    </div>
                </div>
            `;
            card.querySelector('.edit-service-btn').onclick = () => performWizardNav(index);
            grid.appendChild(card);
        });

        // Add Service Ghost Card
        const addCard = document.createElement('div');
        addCard.className = 'business-card add-biz-card add-service-ghost-card';
        addCard.innerHTML = `
            <div class="add-icon"><i class="ph ph-plus"></i></div>
            <span>Add Service</span>
        `;
        addCard.onclick = () => performWizardNav('new');
        grid.appendChild(addCard);
    }

    // Sidebar Menu Listeners
    document.querySelectorAll('.wizard-sidebar .step-item').forEach(item => {
        item.addEventListener('click', () => {
            const step = item.dataset.step;
            attemptWizardNav(step);
        });
    });

    // Back button in editor
    const backToServicesBtn = document.getElementById('btn-back-to-services');
    backToServicesBtn?.addEventListener('click', () => {
        attemptWizardNav('services-list');
    });

    const btnGeneralSaveNext = document.getElementById('btn-general-save-next');
    btnGeneralSaveNext?.addEventListener('click', () => {
        attemptWizardNav('services-list');
    });

    // Save Business button (on services listing page)
    const saveBizBtn = document.getElementById('save-business-btn');
    saveBizBtn?.addEventListener('click', () => {
        const token = localStorage.getItem('gt_token');
        if (!token) { showToast('Session expired. Please login again.'); return; }

        businessName = document.getElementById('businessName')?.value?.trim() || businessName;
        if (!businessName || businessName.length < 3) {
            showToast('Please enter a valid business name first (General Info tab).');
            return;
        }

        const bizStatusToggle = document.getElementById('business-status-toggle');
        const payload = {
            name: businessName,
            status: bizStatusToggle?.checked ? 'active' : 'inactive',
            facilities: savedBusinessTypes
        };

        const saveBtnText = saveBizBtn.querySelector('.btn-text');
        if (saveBtnText) saveBtnText.textContent = 'Saving...';
        saveBizBtn.disabled = true;

        const url = editingBusinessId ? `/businesses/${editingBusinessId}` : '/businesses';
        const method = editingBusinessId ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(data => {
            saveBizBtn.disabled = false;
            const finalLabel = editingBusinessId ? 'Update Business' : 'Save Business';
            if (saveBtnText) saveBtnText.textContent = finalLabel;
            
            if (data.success) {
                showToast(editingBusinessId ? 'Business updated!' : 'Business added!');
                
                // Reset wizard state
                businessName = '';
                const businessNameInput = document.getElementById('businessName');
                if (businessNameInput) businessNameInput.value = '';
                savedBusinessTypes = [];
                resetSubstepA();

                // Navigate back to the business listing page
                navigateToView('view-business-management', true);
                fetchBusinesses();
            } else {
                showToast('Error: ' + (data.message || 'Could not save business.'));
            }
        })
        .catch(err => {
            saveBizBtn.disabled = false;
            const finalLabel = editingBusinessId ? 'Update Business' : 'Save Business';
            if (saveBtnText) saveBtnText.textContent = finalLabel;
            console.error(err);
            showToast('Connection error. Please try again.');
        });
    });

    const unsavedModal = document.getElementById('unsaved-changes-modal');
    const ignoreBtn   = document.getElementById('unsaved-ignore-btn');
    const saveStayBtn = document.getElementById('unsaved-save-btn');

    function attemptWizardNav(target) {
        if (activeWizardTab === target) return;

        if (wizardFormHasChanges) {
            wizardTransitionTarget = target;
            unsavedModal?.classList.remove('hidden');
        } else {
            performWizardNav(target);
        }
    }

    ignoreBtn?.addEventListener('click', () => {
        if (wizardTransitionTarget !== null) {
            performWizardNav(wizardTransitionTarget);
            wizardTransitionTarget = null;
        }
    });

    saveStayBtn?.addEventListener('click', () => {
        // Trigger the appropriate save button
        if (activeWizardTab === 'general') {
            // General info usually auto-persists in the draftBusiness object
            performWizardNav(wizardTransitionTarget);
        } else {
            const saveServiceBtn = document.getElementById('save-business-type-btn');
            saveServiceBtn?.click();
            // The click handler for saveServiceBtn will handle the nav after successful save
        }
    });

    // Add New Service handlers
    const miniAddBtn = document.getElementById('sidebar-add-service-mini');
    miniAddBtn?.addEventListener('click', () => {
        attemptWizardNav('new');
    });

    // Override the old renderSavedTypesList to use sidebar
    function renderSavedTypesList() {
        renderWizardSidebar();
        updateLaunchBtn();
    }

    function loadTypeIntoBuilder(type) {
        if (!type) return;
        currentTypeDraft = { ...type };
        
        if (facStatusToggle) {
            const isActive = type.status !== 'inactive';
            facStatusToggle.checked = isActive;
            facStatusText.textContent = isActive ? 'Active' : 'Inactive';
            facStatusText.className = `status-tiny ${isActive ? 'active' : 'inactive'}`;
        }

        if (selectedTypeText) selectedTypeText.textContent = type.label || 'Service';
        if (selectedTypeIcon) selectedTypeIcon.className = `ph-fill ${type.icon || 'ph-buildings'}`;
        
        typeOptions.forEach(o => {
            o.classList.toggle('selected', o.dataset.value === type.type);
        });

        if (type.needsMode && facilityModeGroup) {
            facilityModeGroup.classList.remove('hidden');
            facilityModeInputs.forEach(i => { i.checked = (i.value === type.mode); });
        } else if (facilityModeGroup) {
            facilityModeGroup.classList.add('hidden');
        }
        updateSubstepANext();

        // Open sub-step B directly with the saved data
        const modeLabels = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & Outdoor' };
        let title = type.label || 'Service';
        if (type.mode) title += ` — ${modeLabels[type.mode]}`;
        if (substepBTitle) substepBTitle.textContent = `Edit: ${title}`;

        // Restore hours
        if (type.hours) {
            document.querySelectorAll('.day-row').forEach(row => {
                const day = row.dataset.day;
                const saved = type.hours[day];
                if (!saved) return;
                const cb = row.querySelector('.day-check');
                const openI = row.querySelector('.open-time');
                const closeI = row.querySelector('.close-time');
                if (cb) cb.checked = !!saved.open;
                if (openI && saved.openTime) openI.value = saved.openTime;
                if (closeI && saved.closeTime) closeI.value = saved.closeTime;
                syncDayRow(row);
            });
        }

        // Restore amenities
        selectedAmenities = [];
        customAmenities   = [];
        if (type.amenities && Array.isArray(type.amenities)) {
            type.amenities.forEach(label => {
                const def = defaultAmenitiesList.find(a => a.label === label);
                if (def) {
                    selectedAmenities.push(def.id);
                } else {
                    const cid = 'custom_' + Date.now() + Math.random();
                    customAmenities.push({ id: cid, label: label, icon: 'ph-star' });
                    selectedAmenities.push(cid);
                }
            });
        }
        renderAmenities();

        // Restore fields
        const pr = document.getElementById('facilityPrice'); if (pr) pr.value = type.price || '';
        
        if (type.weekendPrice) {
            if (tierWknd) tierWknd.classList.remove('hidden');
            if (btnAddWknd) btnAddWknd.style.display = 'none';
            const wepr = document.getElementById('facilityWeekendPrice');
            if (wepr) wepr.value = type.weekendPrice;
            const vwp = document.getElementById('val-weekend-price');
            if (vwp) vwp.textContent = `₹${type.weekendPrice}`;
            document.getElementById('tier-weekend-summary')?.classList.remove('hidden');
            document.getElementById('tier-weekend-edit')?.classList.add('hidden');
        } else {
            if (tierWknd) tierWknd.classList.add('hidden');
            if (btnAddWknd) btnAddWknd.style.display = 'inline-flex';
        }

        if (type.peakPrice) {
            if (tierPeak) tierPeak.classList.remove('hidden');
            if (btnAddPeak) btnAddPeak.style.display = 'none';
            const pkpr = document.getElementById('facilityPeakPrice');
            if (pkpr) pkpr.value = type.peakPrice;
            const pkst = document.getElementById('facilityPeakStart');
            if (pkst && type.peakStart) pkst.value = type.peakStart;
            const pken = document.getElementById('facilityPeakEnd');
            if (pken && type.peakEnd) pken.value = type.peakEnd;
            const vpp = document.getElementById('val-peak-price');
            if (vpp) vpp.textContent = `₹${type.peakPrice}`;
            const vpt = document.getElementById('val-peak-time');
            if (vpt) vpt.textContent = `${type.peakStart || ''} - ${type.peakEnd || ''}`;
            document.getElementById('tier-peak-summary')?.classList.remove('hidden');
            document.getElementById('tier-peak-edit')?.classList.add('hidden');
        } else {
            if (tierPeak) tierPeak.classList.add('hidden');
            if (btnAddPeak) btnAddPeak.style.display = 'inline-flex';
        }

        const cap = document.getElementById('facilityCapacity'); if (cap) cap.value = type.capacity || '';
        const desc = document.getElementById('facilityDesc');    if (desc) desc.value = type.description || '';
        const dc = document.getElementById('desc-char-count');
        if (dc && desc) { dc.textContent = `${desc.value.length} / 300`; }
        const ph = document.getElementById('facilityPhone');     if (ph) ph.value = type.phone || '';
        const wb = document.getElementById('facilityWebsite');   if (wb) wb.value = type.website || '';

        // Jump straight to sub-step B
        if (substepA) substepA.classList.add('hidden');
        if (substepB) substepB.classList.remove('hidden');
        
        setWizardChanged(false); 
    }

    // ── Add Another Business Type ──
    if (addAnotherBtn) {
        addAnotherBtn.addEventListener('click', () => {
            const wizardTitle = viewAddBusiness.querySelector('.page-title');
            if (wizardTitle) wizardTitle.textContent = 'Add New Business';
        
            performWizardNav('general');
            attachChangeTrackers();
            updateLaunchBtn();
        });
    }

    // ══════════════════════════════════════════════════
    //  WORKING HOURS day-toggle logic
    // ══════════════════════════════════════════════════
    function syncDayRow(row) {
        const cb        = row.querySelector('.day-check');
        const openInput = row.querySelector('.open-time');
        const closeInput= row.querySelector('.close-time');
        const statusEl  = row.querySelector('.hours-status');
        if (!cb || !openInput || !closeInput || !statusEl) return;
        const isOpen = cb.checked;
        openInput.disabled  = !isOpen;
        closeInput.disabled = !isOpen;
        statusEl.textContent= isOpen ? 'Open' : 'Closed';
        statusEl.className  = 'hours-status ' + (isOpen ? 'open' : 'closed');
    }

    document.querySelectorAll('.day-row').forEach(row => {
        const cb = row.querySelector('.day-check');
        if (cb) {
            cb.addEventListener('change', () => syncDayRow(row));
            syncDayRow(row); // initial state
        }
    });

    // Apply bulk hours
    const applyBulkBtn = document.getElementById('apply-bulk-hours');
    if (applyBulkBtn) {
        applyBulkBtn.addEventListener('click', () => {
            const bulkOpen  = document.getElementById('bulk-open').value;
            const bulkClose = document.getElementById('bulk-close').value;
            document.querySelectorAll('.day-row').forEach(row => {
                const cb = row.querySelector('.day-check');
                if (cb && cb.checked) {
                    row.querySelector('.open-time').value  = bulkOpen;
                    row.querySelector('.close-time').value = bulkClose;
                }
            });
            showToast('Hours applied to all open days');
        });
    }

    // ── Dynamic Amenities Picker ──

    function renderAmenities(filter = '') {
        const grid = document.getElementById('amenities-selector');
        const selectedList = document.getElementById('selected-amenities-list');
        if (!grid) return;

        grid.innerHTML = '';
        const all = [...defaultAmenitiesList, ...customAmenities];
        
        const filtered = all.filter(a => a.label.toLowerCase().includes(filter.toLowerCase()));

        filtered.forEach(am => {
            const isSelected = selectedAmenities.includes(am.id);
            const chip = document.createElement('div');
            chip.className = `amenity-chip ${isSelected ? 'selected' : ''}`;
            chip.innerHTML = `<i class="ph ${am.icon || 'ph-star'}"></i><span>${am.label}</span>`;
            chip.addEventListener('click', () => {
                if (isSelected) {
                    selectedAmenities = selectedAmenities.filter(id => id !== am.id);
                } else {
                    selectedAmenities.push(am.id);
                }
                renderAmenities(filter);
            });
            grid.appendChild(chip);
        });

        // Update selected list (top row of tags)
        if (selectedList) {
            const selectedData = all.filter(a => selectedAmenities.includes(a.id));
            if (selectedData.length > 0) {
                selectedList.classList.remove('hidden');
                selectedList.innerHTML = selectedData.map(s => `
                    <div class="amenity-tag">
                        <span>${s.label}</span>
                        <i class="ph ph-x remove-tag" data-id="${s.id}"></i>
                    </div>
                `).join('');

                selectedList.querySelectorAll('.remove-tag').forEach(btn => {
                    btn.addEventListener('click', () => {
                        selectedAmenities = selectedAmenities.filter(id => id !== btn.dataset.id);
                        renderAmenities(filter);
                    });
                });
            } else {
                selectedList.classList.add('hidden');
            }
        }
    }

    if (amenitySearch) {
        amenitySearch.addEventListener('input', (e) => {
            renderAmenities(e.target.value);
        });
    }

    if (customTrigger && customModal) {
        customTrigger.addEventListener('click', () => {
            customModal.classList.remove('hidden');
            if (customNameInp) customNameInp.focus();
        });
    }

    if (closeCustom) {
        closeCustom.addEventListener('click', () => {
            customModal.classList.add('hidden');
            if (customNameInp) customNameInp.value = '';
        });
    }

    if (addCustomBtn && customModal) {
        addCustomBtn.addEventListener('click', () => {
            const name = customNameInp?.value?.trim();
            if (name) {
                const id = 'custom_' + Date.now();
                customAmenities.push({ id, label: name, icon: 'ph-star' });
                selectedAmenities.push(id);
                renderAmenities(amenitySearch?.value || '');
                
                // Reset & Close
                customModal.classList.add('hidden');
                if (customNameInp) customNameInp.value = '';
            }
        });

        // Add with Enter key
        customNameInp?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCustomBtn.click();
        });
    }

    // Initialize
    renderAmenities();

    // ── Description char counter ──
    const facilityDesc  = document.getElementById('facilityDesc');
    const descCharCount = document.getElementById('desc-char-count');
    if (facilityDesc && descCharCount) {
        facilityDesc.addEventListener('input', () => {
            const len = facilityDesc.value.length;
            descCharCount.textContent = `${len} / 300`;
            descCharCount.style.color = len > 270 ? '#f59e0b' : 'var(--text-secondary)';
        });
    }

    // ══════════════════════════════════════════════════
    //  TOAST
    // ══════════════════════════════════════════════════
    function showToast(message) {
        const wizardContainer = document.querySelector('.setup-board-container') || document.body;
        if (!wizardContainer) return;
        let container = wizardContainer.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            wizardContainer.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="ph-fill ph-check-circle"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) container.remove();
        }, 3000);
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
