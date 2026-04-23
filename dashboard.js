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
            } else if (linkText === 'Approvals') {
                navigateToView('view-approvals');
                fetchApprovals();
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
    const launchBtn         = document.getElementById('save-business-btn');
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
    let savedBusinessVenues = [];         // { name, location }
    let currentActiveVenue = null;

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
        savedBusinessVenues = [];
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

            let badgeClass = '';
            let badgeText = '';
            if (biz.status === 'active') { badgeClass = 'badge-active'; badgeText = 'Active'; }
            else if (biz.status === 'inactive') { badgeClass = 'badge-inactive'; badgeText = 'Inactive'; }
            else if (biz.status === 'pending') { badgeClass = 'badge-warning'; badgeText = 'Pending Approval'; }
            else if (biz.status === 'rejected') { badgeClass = 'badge-danger'; badgeText = 'Rejected'; }

            let actionButtons = '';
            if (biz.status === 'active' || biz.status === 'inactive') {
                actionButtons = `
                    <button class="biz-btn biz-btn-manage edit-biz-btn" data-id="${biz.id}">
                        <i class="ph ph-pencil-simple"></i> Edit
                    </button>
                    <button class="biz-btn biz-btn-view view-biz-btn" data-id="${biz.id}">
                        <i class="ph ph-eye"></i> View
                    </button>
                `;
            } else if (biz.status === 'rejected') {
                actionButtons = `
                    <button class="biz-btn biz-btn-manage retry-biz-btn" data-id="${biz.id}" data-name="${biz.name}" data-contact="${biz.contact_name || ''}" data-phone="${biz.contact_phone || ''}" data-gst="${biz.gst_vat || ''}" data-address="${biz.registered_address || ''}" data-reason="${biz.reject_reason || ''}">
                        <i class="ph ph-arrow-counter-clockwise"></i> Fix & Resubmit
                    </button>
                `;
            } else if (biz.status === 'pending') {
                actionButtons = `
                    <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="ph ph-hourglass"></i> Under Review</span>
                `;
            }

            card.innerHTML = `
                <div class="biz-card-header">
                    <div class="biz-icon-wrapper">
                        <i class="ph-fill ph-storefront"></i>
                    </div>
                    <div class="biz-badge ${badgeClass}">${badgeText}</div>
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
                        ${actionButtons}
                    </div>
                </div>
            `;
            listGrid.appendChild(card);
        });

        // 🟢 Append Register Business Card at the end
        const addCard = document.createElement('div');
        addCard.className = 'business-card add-biz-card';
        addCard.innerHTML = `
            <div class="add-icon"><i class="ph ph-plus"></i></div>
            <span>Register Business</span>
        `;
        addCard.onclick = () => {
            document.getElementById('form-register-business').reset();
            delete document.getElementById('form-register-business').dataset.editId;
            document.getElementById('reg-rejection-notice').classList.add('hidden');
            navigateToView('view-register-business');
        };
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
                savedBusinessTypes = biz.facilities || [];
                
                // Populate savedBusinessVenues from existing facilities
                const uniqueVenues = {};
                savedBusinessTypes.forEach(f => {
                    if (f.venue) {
                        uniqueVenues[f.venue] = f.venue_location || 'Not specified';
                    }
                });
                savedBusinessVenues = Object.entries(uniqueVenues).map(([name, location]) => ({ name, location }));
                
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

            // Ensure we have a business name
            businessName = document.getElementById('businessName')?.value?.trim() || businessName;
            if (!businessName || businessName.length < 3) {
                showToast('Please enter a valid business name (min 3 chars).');
                // Switch to general tab if name is missing
                performWizardNav('general');
                return;
            }

            const bizStatusToggle = document.getElementById('business-status-toggle');
            const payload = {
                name: businessName,
                status: bizStatusToggle && bizStatusToggle.checked ? 'active' : 'inactive',
                facilities: savedBusinessTypes
            };

            launchBtn.disabled = true;
            const btnText = launchBtn.querySelector('.btn-text');
            const originalText = btnText ? btnText.textContent : 'Save Business';
            if (btnText) btnText.textContent = editingBusinessId ? 'Updating...' : 'Saving...';

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
                    showToast(editingBusinessId ? 'Business updated successfully!' : 'Business saved successfully!');
                    
                    // Reset local state
                    businessName = '';
                    if (businessNameInput) businessNameInput.value = '';
                    savedBusinessTypes = [];
                    if (savedTypesList) savedTypesList.innerHTML = '';
                    savedBusinessVenues = [];
                    resetSubstepA();
                    
                    // Refresh the list
                    fetchBusinesses();

                    // After saving, route back to main management view
                    setTimeout(() => {
                        navigateToView('view-business-management');
                    }, 1000);
                } else {
                    showToast('Error: ' + data.message);
                    launchBtn.disabled = false;
                    if (btnText) btnText.textContent = originalText;
                }
            })
            .catch(err => {
                console.error('Error saving business:', err);
                showToast('Server error while saving.');
                launchBtn.disabled = false;
                if (btnText) btnText.textContent = originalText;
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
            
            // Show unique venues in the sidebar
            savedBusinessVenues.forEach((venue, vIndex) => {
                const item = document.createElement('div');
                // The venue is "active" if we are in services-list view or editing a service belonging to this venue
                const isActive = (activeWizardTab === 'services-list') || 
                                 (typeof activeWizardTab === 'number' && savedBusinessTypes[activeWizardTab]?.venue === venue.name);
                
                item.className = `sidebar-sub-item ${isActive ? 'active' : ''}`;
                item.innerHTML = `<i class="ph ph-map-pin"></i><span>${venue.name}</span>`;
                item.onclick = () => {
                    performWizardNav('services-list');
                    // Open the venue details modal to see its services
                    openVenueDetails(venue);
                };
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

        // Group services by venue
        const venueGroups = {};
        
        // 1. Add venues that have services
        savedBusinessTypes.forEach(type => {
            const vName = type.venue || 'General';
            if (!venueGroups[vName]) {
                venueGroups[vName] = {
                    name: vName,
                    location: type.venue_location || 'Not specified',
                    services: []
                };
            }
            venueGroups[vName].services.push(type);
        });

        // 2. Add venues that don't have services yet
        savedBusinessVenues.forEach(v => {
            if (!venueGroups[v.name]) {
                venueGroups[v.name] = {
                    name: v.name,
                    location: v.location,
                    services: []
                };
            }
        });

        const groups = Object.values(venueGroups);

        groups.forEach((venue, vIndex) => {
            const card = document.createElement('div');
            card.className = 'business-card service-card venue-card';
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <button type="button" class="biz-btn delete-venue-btn" style="position: absolute; top: 0.75rem; right: 0.75rem; background: none; border: none; color: #ef4444; width: auto; min-width: 0; padding: 0.25rem; z-index: 5; transition: all 0.2s; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));" title="Delete Venue">
                    <i class="ph ph-trash" style="font-size: 1.3rem;"></i>
                </button>
                <div class="biz-card-header" style="padding: 1.25rem 1.25rem 0.75rem 1.25rem; display: flex; align-items: flex-start; gap: 1rem; border-bottom: none;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.65rem; min-width: 60px;">
                        <div class="biz-icon-wrapper" style="margin: 0; width: 44px; height: 44px; font-size: 1.35rem; background: linear-gradient(135deg, var(--primary), #818cf8); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                            <i class="ph-fill ph-buildings"></i>
                        </div>
                        <div class="biz-badge" style="margin: 0; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); font-size: 0.6rem; padding: 0.2rem 0.4rem; white-space: nowrap;">
                            ${venue.services.length} SERVICES
                        </div>
                    </div>
                    <div style="padding-top: 0.15rem; flex: 1; min-width: 0;">
                        <div class="biz-name" style="margin: 0; font-size: 1.35rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${venue.name}</div>
                        <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
                            <i class="ph ph-map-pin" style="color: var(--primary);"></i>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${venue.location}</span>
                        </div>
                    </div>
                </div>
                <div class="biz-card-body" style="padding: 0.75rem 1.25rem; flex: 1;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); min-height: 48px;">
                        ${venue.services.length === 0 ? 
                            `<span style="font-size: 0.75rem; color: var(--text-muted);">No services added</span>` : 
                            venue.services.slice(0, 6).map(s => `
                                <div title="${s.label}" style="width: 32px; height: 32px; background: rgba(255,255,255,0.04); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--primary); border: 1px solid rgba(255,255,255,0.05);">
                                    <i class="ph-fill ${s.icon || 'ph-buildings'}" style="font-size: 1rem;"></i>
                                </div>
                            `).join('')
                        }
                        ${venue.services.length > 6 ? `<div style="font-size: 0.7rem; color: var(--text-muted); display: flex; align-items: center; padding-left: 2px;">+${venue.services.length - 6} more</div>` : ''}
                    </div>
                </div>
                <div class="biz-card-footer" style="padding: 0.75rem 1.25rem 1.25rem 1.25rem; border-top: none;">
                    <div class="biz-actions">
                        <button type="button" class="biz-btn biz-btn-manage view-venue-btn" style="width: 100%; height: 42px; font-size: 0.9rem;">
                            <i class="ph ph-list-bullets"></i> View Services
                        </button>
                    </div>
                </div>
            `;
            
            // Add click listener to the whole card for viewing
            card.onclick = (e) => {
                if (e.target.closest('.delete-venue-btn')) return;
                openVenueDetails(venue);
            };

            // Add click listener specifically for delete
            const delBtn = card.querySelector('.delete-venue-btn');
            delBtn.onclick = (e) => {
                e.stopPropagation();
                handleDeleteVenue(venue);
            };

            grid.appendChild(card);
        });

        // Add Venue Ghost Card
        const addCard = document.createElement('div');
        addCard.className = 'business-card add-biz-card';
        addCard.innerHTML = `
            <div class="add-icon"><i class="ph ph-plus"></i></div>
            <span>Add Venue</span>
        `;
        addCard.onclick = () => {
            const modal = document.getElementById('add-venue-modal');
            if (modal) {
                document.getElementById('new-venue-name').value = '';
                document.getElementById('new-venue-location').value = '';
                modal.classList.remove('hidden');
            }
        };
        grid.appendChild(addCard);

        // Keep sidebar in sync
        renderWizardSidebar();
    }

    function openVenueDetails(venue) {
        currentActiveVenue = venue;
        const modal = document.getElementById('venue-details-modal');
        if (!modal) return;

        document.getElementById('vdm-name').textContent = venue.name;
        document.getElementById('vdm-location').textContent = venue.location;
        
        const grid = document.getElementById('vdm-services-grid');
        grid.innerHTML = '';

        if (venue.services.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">
                    <i class="ph ph-info" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    No services added to this venue yet.
                </div>
            `;
        } else {
            venue.services.forEach((type, sIndex) => {
                const card = document.createElement('div');
                card.className = 'business-card service-card';
                card.style.background = 'rgba(255,255,255,0.03)';
                card.innerHTML = `
                    <button type="button" class="biz-btn delete-service-btn" style="position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: #ef4444; width: auto; min-width: 0; padding: 0.25rem; z-index: 5; transition: all 0.2s; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));" title="Delete Service">
                        <i class="ph ph-trash" style="font-size: 1rem;"></i>
                    </button>
                    <div class="biz-card-header" style="padding: 0.75rem;">
                        <div class="biz-icon-wrapper" style="width: 30px; height: 30px;"><i class="ph-fill ${type.icon || 'ph-buildings'}" style="font-size: 1rem;"></i></div>
                        <div class="biz-badge" style="font-size: 0.7rem;">${type.status}</div>
                    </div>
                    <div class="biz-card-body" style="padding: 0.75rem;">
                        <div class="biz-name" style="font-size: 0.95rem;">${type.label}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">₹${type.price || 0}/hr</div>
                    </div>
                `;
                
                const delBtn = card.querySelector('.delete-service-btn');
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    handleDeleteService(type);
                };

                grid.appendChild(card);
            });
        }

        modal.classList.remove('hidden');
    }

    // Modal Close Listeners
    document.getElementById('close-add-venue-modal')?.addEventListener('click', () => document.getElementById('add-venue-modal').classList.add('hidden'));
    document.getElementById('cancel-add-venue')?.addEventListener('click', () => document.getElementById('add-venue-modal').classList.add('hidden'));
    document.getElementById('close-vdm-modal')?.addEventListener('click', () => document.getElementById('venue-details-modal').classList.add('hidden'));
    document.getElementById('vdm-close-btn')?.addEventListener('click', () => document.getElementById('venue-details-modal').classList.add('hidden'));

    // Confirm Add Venue
    document.getElementById('confirm-add-venue')?.addEventListener('click', () => {
        const name = document.getElementById('new-venue-name').value.trim();
        const location = document.getElementById('new-venue-location').value.trim();
        
        if (!name || !location) {
            showToast('Please enter both name and location.');
            return;
        }

        savedBusinessVenues.push({ name, location });
        document.getElementById('add-venue-modal').classList.add('hidden');
        renderServicesGrid();
        renderWizardSidebar();
        showToast(`Venue "${name}" added!`);
    });

    // Add Service to Venue
    document.getElementById('vdm-add-service-btn')?.addEventListener('click', () => {
        document.getElementById('venue-details-modal').classList.add('hidden');
        performWizardNav('new');
        // Pre-fill venue info for the new service
        if (currentActiveVenue) {
            currentTypeDraft.venue = currentActiveVenue.name;
            currentTypeDraft.venue_location = currentActiveVenue.location;
        }
    });

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

    // Add New Venue handlers (from sidebar)
    const miniAddVenueBtn = document.getElementById('sidebar-add-venue-mini');
    miniAddVenueBtn?.addEventListener('click', () => {
        const modal = document.getElementById('add-venue-modal');
        if (modal) {
            document.getElementById('new-venue-name').value = '';
            document.getElementById('new-venue-location').value = '';
            modal.classList.remove('hidden');
        }
    });

    // Override the old renderSavedTypesList to use sidebar
    function renderSavedTypesList() {
        renderWizardSidebar();
        updateLaunchBtn();
    }

    // ══════════════════════════════════════════════════
    //  DELETE FUNCTIONALITY
    // ══════════════════════════════════════════════════
    function showDeleteConfirmation(config) {
        const modal = document.getElementById('delete-confirm-modal');
        if (!modal) return;

        document.getElementById('dcm-title').textContent = config.title || 'Confirm Delete';
        document.getElementById('dcm-message').textContent = config.message || 'Are you sure?';
        
        const summary = document.getElementById('dcm-summary');
        const summaryList = document.getElementById('dcm-summary-list');
        
        if (config.summary && config.summary.length > 0) {
            summary.style.display = 'block';
            summaryList.innerHTML = config.summary.map(s => `<li>${s}</li>`).join('');
        } else {
            summary.style.display = 'none';
        }

        const confirmBtn = document.getElementById('dcm-confirm-btn');
        const cancelBtn = document.getElementById('dcm-cancel-btn');

        // Clear previous listeners
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        
        newConfirm.onclick = () => {
            modal.classList.add('hidden');
            if (config.onConfirm) config.onConfirm();
        };

        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            if (config.onCancel) config.onCancel();
        };

        modal.classList.remove('hidden');
    }

    async function handleDeleteVenue(venue) {
        const services = savedBusinessTypes.filter(f => f.venue === venue.name);
        
        showDeleteConfirmation({
            title: 'Delete Venue',
            message: `Are you sure you want to delete "${venue.name}"?`,
            summary: services.map(s => s.label || s.type),
            onConfirm: async () => {
                if (editingBusinessId) {
                    const token = localStorage.getItem('gt_token');
                    try {
                        const res = await fetch(`/businesses/${editingBusinessId}/venues/${encodeURIComponent(venue.name)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (!data.success) {
                            showToast('Server error: ' + data.message);
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Failed to delete from server.');
                        return;
                    }
                }

                // Update Local State
                savedBusinessTypes = savedBusinessTypes.filter(f => f.venue !== venue.name);
                savedBusinessVenues = savedBusinessVenues.filter(v => v.name !== venue.name);
                
                renderServicesGrid();
                renderWizardSidebar();
                showToast(`Venue "${venue.name}" and its services removed.`);
            }
        });
    }

    async function handleDeleteService(service) {
        showDeleteConfirmation({
            title: 'Delete Service',
            message: `Are you sure you want to remove "${service.label || service.type}"?`,
            onConfirm: async () => {
                if (editingBusinessId && service.fac_id) {
                    const token = localStorage.getItem('gt_token');
                    try {
                        const res = await fetch(`/businesses/${editingBusinessId}/facilities/${service.fac_id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (!data.success) {
                            showToast('Server error: ' + data.message);
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Failed to delete from server.');
                        return;
                    }
                }

                // Update Local State
                savedBusinessTypes = savedBusinessTypes.filter(f => f !== service);
                
                // Refresh views
                if (currentActiveVenue) {
                    // Update the active venue services list in memory
                    currentActiveVenue.services = currentActiveVenue.services.filter(f => f !== service);
                    openVenueDetails(currentActiveVenue);
                }
                renderServicesGrid();
                renderWizardSidebar();
                showToast('Service removed.');
            }
        });
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
    // ═══════════════════════════════════════════════════
    //  BUSINESS REGISTRATION & APPROVALS LOGIC
    // ═══════════════════════════════════════════════════

    // 1. Navigation & Setup
    const btnEmptyRegister = document.getElementById('btn-empty-register-biz');
    if (btnEmptyRegister) {
        btnEmptyRegister.addEventListener('click', () => {
            document.getElementById('form-register-business').reset();
            delete document.getElementById('form-register-business').dataset.editId;
            document.getElementById('reg-rejection-notice').classList.add('hidden');
            navigateToView('view-register-business');
        });
    }

    const btnCancelRegister = document.getElementById('btn-cancel-register');
    if (btnCancelRegister) {
        btnCancelRegister.addEventListener('click', () => {
            navigateToView('view-business-management');
        });
    }

    // Handle "Fix & Resubmit" clicks
    document.addEventListener('click', (e) => {
        const retryBtn = e.target.closest('.retry-biz-btn');
        if (retryBtn) {
            e.stopPropagation();
            const id = retryBtn.dataset.id;
            const name = retryBtn.dataset.name;
            const contact = retryBtn.dataset.contact;
            const phone = retryBtn.dataset.phone;
            const gst = retryBtn.dataset.gst;
            const address = retryBtn.dataset.address;
            const reason = retryBtn.dataset.reason;

            const form = document.getElementById('form-register-business');
            form.dataset.editId = id;
            document.getElementById('regBizName').value = name;
            document.getElementById('regBizContactName').value = contact;
            document.getElementById('regBizContactPhone').value = phone;
            document.getElementById('regBizGst').value = gst;
            document.getElementById('regBizAddress').value = address;
            
            const notice = document.getElementById('reg-rejection-notice');
            document.getElementById('reg-rejection-reason').textContent = reason || 'No specific reason provided.';
            notice.classList.remove('hidden');

            navigateToView('view-register-business');
        }
    });

    // 2. Submit Registration Form
    const registerForm = document.getElementById('form-register-business');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const token = localStorage.getItem('gt_token');
            if (!token) return;

            const payload = {
                name: document.getElementById('regBizName').value.trim(),
                contact_name: document.getElementById('regBizContactName').value.trim(),
                contact_phone: document.getElementById('regBizContactPhone').value.trim(),
                gst_vat: document.getElementById('regBizGst').value.trim(),
                registered_address: document.getElementById('regBizAddress').value.trim()
            };

            if (registerForm.dataset.editId) {
                payload.bizId = registerForm.dataset.editId;
            }

            const btn = document.getElementById('btn-submit-register');
            const text = btn.querySelector('.btn-text');
            const loader = btn.querySelector('.btn-loader');
            text.classList.add('hidden');
            loader.classList.remove('hidden');
            btn.disabled = true;

            fetch('/businesses/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                text.classList.remove('hidden');
                loader.classList.add('hidden');
                btn.disabled = false;

                if (data.success) {
                    showToast(registerForm.dataset.editId ? 'Application Resubmitted!' : 'Application Sent for Review!');
                    navigateToView('view-business-management');
                    fetchBusinesses();
                } else {
                    showToast('Error: ' + (data.message || 'Could not register business.'));
                }
            })
            .catch(err => {
                console.error(err);
                text.classList.remove('hidden');
                loader.classList.add('hidden');
                btn.disabled = false;
                showToast('Server error. Please try again later.');
            });
        });
    }

    // 3. Admin Approvals Flow
    window.fetchApprovals = function() {
        const token = localStorage.getItem('gt_token');
        if (!token) return;

        fetch('/admin/approvals', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderApprovalsList(data.approvals);
            }
        })
        .catch(err => console.error('Error fetching approvals:', err));
    };

    function renderApprovalsList(approvals) {
        const listGrid = document.getElementById('approvals-list-grid');
        const emptyState = document.getElementById('approvals-empty-state');
        
        if (!listGrid) return;
        listGrid.innerHTML = '';

        if (approvals.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            listGrid.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        listGrid.classList.remove('hidden');

        approvals.forEach(appr => {
            const card = document.createElement('div');
            card.className = 'business-card';
            card.innerHTML = `
                <div class="biz-card-header">
                    <div class="biz-icon-wrapper"><i class="ph-fill ph-clipboard-text"></i></div>
                    <div class="biz-badge badge-warning">Pending Review</div>
                </div>
                <div class="biz-card-body" style="gap: 0.5rem;">
                    <div class="biz-name" style="margin-bottom: 0.5rem;">${appr.name}</div>
                    <div class="biz-owner" style="font-size: 0.9rem;">
                        <i class="ph ph-user"></i> Contact: ${appr.contact_name}
                    </div>
                    <div class="biz-owner" style="font-size: 0.9rem;">
                        <i class="ph ph-phone"></i> Phone: ${appr.contact_phone}
                    </div>
                    <div class="biz-owner" style="font-size: 0.9rem;">
                        <i class="ph ph-identification-card"></i> GST/VAT: ${appr.gst_vat}
                    </div>
                    <div class="biz-owner" style="font-size: 0.9rem;">
                        <i class="ph ph-map-pin"></i> Address: ${appr.registered_address}
                    </div>
                    <div class="meta-item" style="margin-top: 0.5rem;">
                        <i class="ph ph-calendar"></i>
                        <span>Submitted ${new Date(appr.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="biz-card-footer">
                    <div class="biz-actions" style="justify-content: flex-end; gap: 0.5rem;">
                        <button class="submit-btn" style="background: var(--danger); border-color: var(--danger); padding: 0.5rem 1rem; border-radius: 8px;" onclick="promptReject(${appr.id})">
                            <span class="btn-text">Reject</span>
                        </button>
                        <button class="submit-btn primary-action-btn" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="approveBusiness(${appr.id})">
                            <span class="btn-text">Approve</span>
                        </button>
                    </div>
                </div>
            `;
            listGrid.appendChild(card);
        });
    }

    let currentApproveId = null;
    window.approveBusiness = function(id) {
        currentApproveId = id;
        const commentInput = document.getElementById('approve-comment-input');
        if (commentInput) commentInput.value = '';
        const modal = document.getElementById('approve-modal');
        if (modal) modal.classList.remove('hidden');
    };

    const btnCancelApprove = document.getElementById('btn-cancel-approve');
    if (btnCancelApprove) {
        btnCancelApprove.addEventListener('click', () => {
            document.getElementById('approve-modal').classList.add('hidden');
            currentApproveId = null;
        });
    }

    const btnConfirmApprove = document.getElementById('btn-confirm-approve');
    if (btnConfirmApprove) {
        btnConfirmApprove.addEventListener('click', () => {
            if (!currentApproveId) return;
            const comment = document.getElementById('approve-comment-input').value.trim();
            const token = localStorage.getItem('gt_token');
            
            const btn = document.getElementById('btn-confirm-approve');
            const originalText = btn.querySelector('.btn-text').textContent;
            btn.querySelector('.btn-text').textContent = 'Approving...';
            btn.disabled = true;

            fetch('/admin/approvals/' + currentApproveId + '/approve', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ comment })
            })
            .then(r => r.json())
            .then(data => {
                document.getElementById('approve-modal').classList.add('hidden');
                if (data.success) {
                    showToast('Business Approved!');
                    fetchApprovals();
                } else {
                    showToast('Error approving business.');
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Server error.');
            })
            .finally(() => {
                btn.querySelector('.btn-text').textContent = originalText;
                btn.disabled = false;
                currentApproveId = null;
            });
        });
    }

    let currentRejectId = null;
    window.promptReject = function(id) {
        currentRejectId = id;
        document.getElementById('reject-reason-input').value = '';
        document.getElementById('reject-modal').classList.remove('hidden');
    };

    const btnCancelReject = document.getElementById('btn-cancel-reject');
    if (btnCancelReject) {
        btnCancelReject.addEventListener('click', () => {
            document.getElementById('reject-modal').classList.add('hidden');
            currentRejectId = null;
        });
    }

    const btnConfirmReject = document.getElementById('btn-confirm-reject');
    if (btnConfirmReject) {
        btnConfirmReject.addEventListener('click', () => {
            if (!currentRejectId) return;
            const reason = document.getElementById('reject-reason-input').value.trim();
            if (!reason) {
                showToast('Please provide a reason for rejection.');
                return;
            }

            const token = localStorage.getItem('gt_token');
            fetch('/admin/approvals/' + currentRejectId + '/reject', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ reason })
            })
            .then(r => r.json())
            .then(data => {
                document.getElementById('reject-modal').classList.add('hidden');
                if (data.success) {
                    showToast('Business Rejected.');
                    fetchApprovals();
                } else {
                    showToast('Error rejecting business.');
                }
            });
        });
    }
});
