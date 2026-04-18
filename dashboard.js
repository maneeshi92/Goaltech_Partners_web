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
                fetchBusinesses();
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

    let currentStep = 1;
    let currentTypeDraft = { type: null, label: null, icon: null, needsMode: false, mode: null };
    let savedBusinessTypes = [];          // array of saved type objects
    let businessName = '';
    let editingBusinessId = null;

    // ── Route: empty-state & top-bar "Add New Business" → wizard ──
    const openAddWizard = () => {
        editingBusinessId = null;
        viewSections.forEach(v => v.classList.remove('active'));
        viewAddBusiness.classList.add('active');
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

            viewSections.forEach(v => v.classList.remove('active'));
            document.getElementById('view-business-management').classList.add('active');
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
        if (substepANext) substepANext.disabled = true;

        // Show A, hide B
        if (substepA) substepA.classList.add('active');
        if (substepB) substepB.classList.remove('active');
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
        // Amenity chips
        document.querySelectorAll('.amenity-chip').forEach(c => c.classList.remove('selected'));
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

        // 🟢 Prepend Add New Business Card
        const addCard = document.createElement('div');
        addCard.className = 'business-card add-biz-card';
        addCard.innerHTML = `
            <div class="add-icon"><i class="ph ph-plus"></i></div>
            <span>Add New Business</span>
        `;
        addCard.addEventListener('click', openAddWizard);
        listGrid.appendChild(addCard);

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
                    <div class="biz-badge">Active</div>
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
                typesGrid.innerHTML = biz.facilities.map(f => `
                    <div class="detail-item">
                        <i class="${f.icon || 'ph ph-buildings'}"></i>
                        <span>${f.label || f.type}</span>
                    </div>
                `).join('');

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
                viewSections.forEach(v => v.classList.remove('active'));
                viewAddBusiness.classList.add('active');
                
                // Initialize State
                initWizardState();
                businessName = biz.name;
                if (businessNameInput) businessNameInput.value = biz.name;
                
                // Load Facilities
                savedBusinessTypes = biz.facilities;
                savedBusinessTypes.forEach((type, idx) => {
                    renderSavedTypeCard(type, idx);
                });

                // Update UI
                const wizardTitle = viewAddBusiness.querySelector('.page-title');
                if (wizardTitle) wizardTitle.textContent = 'Edit Business';
                updateLaunchBtn();
                
                // Switch Nav
                navLinks.forEach(l => l.classList.remove('active'));
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
                        viewSections.forEach(v => v.classList.remove('active'));
                        document.getElementById('view-business-management').classList.add('active');
                        // Update nav active state
                        navLinks.forEach(l => {
                            l.classList.toggle('active', l.textContent.trim() === 'Business Mgmt');
                        });
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
            // Build title for sub-step B
            let title = currentTypeDraft.label;
            if (currentTypeDraft.mode) {
                const modeLabels = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & Outdoor' };
                title += ` — ${modeLabels[currentTypeDraft.mode]}`;
            }
            if (substepBTitle) substepBTitle.textContent = `Configure: ${title}`;

            // Reset B fields for new type
            resetSubstepBFields();

            substepA.classList.remove('active');
            substepB.classList.add('active');
        });
    }

    // Sub-step B → A (back)
    if (substepBBack) {
        substepBBack.addEventListener('click', () => {
            substepB.classList.remove('active');
            substepA.classList.add('active');
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
            const amenities = [...document.querySelectorAll('.amenity-chip.selected')]
                .map(c => c.dataset.amenity);

            const savedType = {
                ...currentTypeDraft,
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

            savedBusinessTypes.push(savedType);
            renderSavedTypeCard(savedType, savedBusinessTypes.length - 1);

            // Hide builder panel, show "Add another" button
            if (builderPanel) builderPanel.classList.add('hidden');
            if (addAnotherBtn) addAnotherBtn.classList.remove('hidden');

            updateLaunchBtn();
            showToast(`"${savedType.label}" saved successfully!`);
        });
    }

    function renderSavedTypeCard(type, index) {
        if (!savedTypesList) return;
        const modeLabels = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & Outdoor' };
        const modeStr = type.mode ? ` · ${modeLabels[type.mode]}` : '';
        const amenityCount = type.amenities.length;
        const openDays = Object.values(type.hours).filter(h => h.open).length;
        let priceStr = type.price ? `₹${type.price}/hr Base` : 'No base price';
        if (type.weekendPrice) priceStr += ` · ₹${type.weekendPrice}/hr Wknd`;
        if (type.peakPrice) priceStr += ` · ₹${type.peakPrice}/hr Peak`;

        const card = document.createElement('div');
        card.className = 'saved-type-card';
        card.dataset.index = index;
        card.innerHTML = `
            <div class="saved-type-card-main">
                <div class="saved-type-icon"><i class="ph-fill ${type.icon}"></i></div>
                <div class="saved-type-info">
                    <div class="saved-type-name">${type.label}${modeStr}</div>
                    <div class="saved-type-summary">
                        <span><i class="ph ph-users"></i> Max ${type.capacity || 'N/A'}</span>
                        <span><i class="ph ph-calendar-check"></i> ${openDays} Days</span>
                        <span><i class="ph ph-tag"></i> <strong>${priceStr}</strong></span>
                    </div>
                </div>
                <div class="saved-type-actions">
                    <button class="saved-type-action edit" title="Edit" data-index="${index}"><i class="ph ph-pencil-simple"></i></button>
                    <button class="saved-type-action remove" title="Remove" data-index="${index}"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `;

        // Edit
        card.querySelector('.saved-type-action.edit').addEventListener('click', () => {
            // Pull this type back for editing
            loadTypeIntoBuilder(type);
            savedBusinessTypes.splice(index, 1);
            card.remove();
            // Show builder, hide 'add another' if no types left
            if (builderPanel) builderPanel.classList.remove('hidden');
            if (savedBusinessTypes.length === 0 && addAnotherBtn) addAnotherBtn.classList.add('hidden');
            updateLaunchBtn();
        });

        // Remove
        card.querySelector('.saved-type-action.remove').addEventListener('click', () => {
            savedBusinessTypes.splice(index, 1);
            card.remove();
            updateLaunchBtn();
            if (savedBusinessTypes.length === 0) {
                if (builderPanel) builderPanel.classList.remove('hidden');
                if (addAnotherBtn) addAnotherBtn.classList.add('hidden');
                resetSubstepA();
            }
        });

        savedTypesList.appendChild(card);
    }

    function loadTypeIntoBuilder(type) {
        // Populate sub-step A
        currentTypeDraft = { ...type };
        if (selectedTypeText) selectedTypeText.textContent = type.label;
        if (selectedTypeIcon) selectedTypeIcon.className = `ph-fill ${type.icon}`;
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
        let title = type.label;
        if (type.mode) title += ` — ${modeLabels[type.mode]}`;
        if (substepBTitle) substepBTitle.textContent = `Edit: ${title}`;

        // Restore hours
        document.querySelectorAll('.day-row').forEach(row => {
            const day = row.dataset.day;
            const saved = type.hours[day];
            if (!saved) return;
            const cb = row.querySelector('.day-check');
            const openI = row.querySelector('.open-time');
            const closeI = row.querySelector('.close-time');
            if (cb) cb.checked = saved.open;
            if (openI && saved.openTime) openI.value = saved.openTime;
            if (closeI && saved.closeTime) closeI.value = saved.closeTime;
            syncDayRow(row);
        });

        // Restore amenities
        document.querySelectorAll('.amenity-chip').forEach(chip => {
            chip.classList.toggle('selected', type.amenities.includes(chip.dataset.amenity));
        });

        // Restore fields
        const pr = document.getElementById('facilityPrice');     if (pr) pr.value = type.price || '';
        
        // Restore Advanced Pricing
        if (type.weekendPrice) {
            if (tierWknd) tierWknd.classList.remove('hidden');
            if (btnAddWknd) btnAddWknd.style.display = 'none';
            const wepr = document.getElementById('facilityWeekendPrice');
            if (wepr) wepr.value = type.weekendPrice;
            document.getElementById('val-weekend-price').textContent = `₹${type.weekendPrice}`;
            document.getElementById('tier-weekend-summary').classList.remove('hidden');
            document.getElementById('tier-weekend-edit').classList.add('hidden');
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
            document.getElementById('val-peak-price').textContent = `₹${type.peakPrice}`;
            document.getElementById('val-peak-time').textContent = `${type.peakStart} - ${type.peakEnd}`;
            document.getElementById('tier-peak-summary').classList.remove('hidden');
            document.getElementById('tier-peak-edit').classList.add('hidden');
        } else {
            if (tierPeak) tierPeak.classList.add('hidden');
            if (btnAddPeak) btnAddPeak.style.display = 'inline-flex';
        }

        const cap = document.getElementById('facilityCapacity'); if (cap) cap.value = type.capacity || '';
        const desc = document.getElementById('facilityDesc');    if (desc) desc.value = type.description || '';
        const dc = document.getElementById('desc-char-count');
        if (dc && desc) { dc.textContent = `${desc.value.length} / 300`; }
        const ph = document.getElementById('facilityPhone');     if (ph)  ph.value  = type.phone   || '';
        const wb = document.getElementById('facilityWebsite');   if (wb)  wb.value  = type.website || '';

        // Jump straight to sub-step B
        if (substepA) substepA.classList.remove('active');
        if (substepB) substepB.classList.add('active');
    }

    // ── Add Another Business Type ──
    if (addAnotherBtn) {
        addAnotherBtn.addEventListener('click', () => {
            addAnotherBtn.classList.add('hidden');
            if (builderPanel) builderPanel.classList.remove('hidden');
            resetSubstepA();
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

    // ── Amenity chip toggle ──
    document.querySelectorAll('.amenity-chip').forEach(chip => {
        chip.addEventListener('click', () => chip.classList.toggle('selected'));
    });

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
