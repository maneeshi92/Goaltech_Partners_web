/**
 * GoalTech — Auth Logic
 * Handles: Registration validation (live), OTP, Backend API Integration, Login
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── Screens ─────────────────────────────────────────────
    const registerScreen = document.getElementById('register-screen');
    const loginScreen = document.getElementById('login-screen');
    const otpScreen = document.getElementById('otp-screen');
    const successOverlay = document.getElementById('success-overlay');

    // ── Forms / Buttons ──────────────────────────────────────
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const resendOtpBtn = document.getElementById('resend-otp');
    const goToLogin = document.getElementById('go-to-login');
    const goToRegister = document.getElementById('go-to-register');

    // ── Register Fields ──────────────────────────────────────
    const regName = document.getElementById('reg-name');
    const regEmail = document.getElementById('reg-email');
    const regPhone = document.getElementById('reg-phone');
    const regPass = document.getElementById('reg-password');
    const regConfirm = document.getElementById('reg-confirm-password');

    // ── Live Indicator Elements ───────────────────────────────
    const checkLength = document.getElementById('check-length');
    const checkUpper = document.getElementById('check-upper');
    const checkNumber = document.getElementById('check-number');
    const checkSpecial = document.getElementById('check-special');
    const matchLabel = document.getElementById('match-label');
    const nomatchLabel = document.getElementById('nomatch-label');
    const confirmStatus = document.getElementById('confirm-status');
    const emailStatus = document.getElementById('email-status');

    // ── OTP Screen ───────────────────────────────────────────
    const userEmailDisplay = document.getElementById('user-email-display');
    const otpInputs = document.querySelectorAll('.otp-input');

    // ── Session / DB ─────────────────────────────────────────
    let pendingUser = null;

    // API base URL — dynamically adapt to whatever domain we are on (e.g. Render)
    const API_BASE = '';

    // LocalStorage user storage removed as per request.
    // Session state is now handled via gt_auth and gt_userName.

    // ════════════════════════════════════════════════════════
    // SCREEN SWITCHING
    // ════════════════════════════════════════════════════════
    function showScreen(screen) {
        [registerScreen, loginScreen, otpScreen].forEach(s => {
            if (s !== screen) s.classList.add('hidden');
        });
        screen.classList.remove('hidden');
        screen.classList.add('slide-in');
        setTimeout(() => screen.classList.remove('slide-in'), 400);
    }

    goToLogin.addEventListener('click', (e) => { e.preventDefault(); showScreen(loginScreen); });
    goToRegister.addEventListener('click', (e) => { e.preventDefault(); showScreen(registerScreen); });

    // ── Mobile tab switcher & bottom switch links ─────────────
    // Register screen — tabs
    document.getElementById('mobile-tab-login-reg')?.addEventListener('click', (e) => { e.preventDefault(); showScreen(loginScreen); });
    document.getElementById('mobile-tab-register-reg')?.addEventListener('click', (e) => { e.preventDefault(); showScreen(registerScreen); });
    // Login screen — tabs
    document.getElementById('mobile-tab-login-login')?.addEventListener('click', (e) => { e.preventDefault(); showScreen(loginScreen); });
    document.getElementById('mobile-tab-register-login')?.addEventListener('click', (e) => { e.preventDefault(); showScreen(registerScreen); });
    // Bottom switch link on login screen
    document.getElementById('go-to-register-mobile')?.addEventListener('click', (e) => { e.preventDefault(); showScreen(registerScreen); });

    // ════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════
    function showError(form, id, message) {
        const el = document.getElementById(id);
        el.querySelector('.error-text').textContent = message;
        el.classList.remove('hidden');
        form.classList.add('shake');
        form.style.animation = 'none';
        form.offsetHeight;
        form.style.animation = 'shake 0.5s ease';
    }

    function clearError(id) {
        document.getElementById(id)?.classList.add('hidden');
    }

    function setCheckItem(el, valid) {
        const icon = el.querySelector('i');
        if (valid) {
            el.classList.add('valid');
            el.classList.remove('invalid');
            icon.className = 'ph-fill ph-check-circle';
        } else {
            el.classList.remove('valid');
            el.classList.add('invalid');
            icon.className = 'ph ph-x-circle';
        }
    }

    function setLoading(btn, loading) {
        const text = btn.querySelector('.btn-text');
        const icon = btn.querySelector('.btn-icon');
        const spinner = btn.querySelector('.spinner');
        btn.disabled = loading;
        if (loading) {
            text.classList.add('hidden');
            icon?.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            text.classList.remove('hidden');
            icon?.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    // ════════════════════════════════════════════════════════
    // PASSWORD TOGGLE
    // ════════════════════════════════════════════════════════
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling.tagName === 'INPUT'
                ? btn.previousElementSibling
                : btn.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            btn.querySelector('i').className = type === 'password' ? 'ph ph-eye' : 'ph ph-eye-closed';
        });
    });

    // ════════════════════════════════════════════════════════
    // LIVE PASSWORD COMPLEXITY CHECK
    // ════════════════════════════════════════════════════════
    regPass.addEventListener('input', () => {
        const val = regPass.value;
        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasNumber = /[0-9]/.test(val);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);

        setCheckItem(checkLength, hasLength);
        setCheckItem(checkUpper, hasUpper);
        setCheckItem(checkNumber, hasNumber);
        setCheckItem(checkSpecial, hasSpecial);

        // Also re-check confirm field when password changes
        if (regConfirm.value.length > 0) {
            checkPasswordMatch();
        }
        clearError('register-error');
    });

    // ════════════════════════════════════════════════════════
    // LIVE CONFIRM PASSWORD MATCH CHECK
    // ════════════════════════════════════════════════════════
    function checkPasswordMatch() {
        const pass = regPass.value;
        const confirm = regConfirm.value;

        if (confirm.length === 0) {
            matchLabel.classList.add('hidden');
            nomatchLabel.classList.add('hidden');
            confirmStatus.textContent = '';
            return;
        }

        if (pass === confirm) {
            matchLabel.classList.remove('hidden');
            nomatchLabel.classList.add('hidden');
            confirmStatus.classList.add('valid');
            confirmStatus.classList.remove('invalid');
            confirmStatus.innerHTML = '<i class="ph-fill ph-check-circle"></i>';
        } else {
            nomatchLabel.classList.remove('hidden');
            matchLabel.classList.add('hidden');
            confirmStatus.classList.add('invalid');
            confirmStatus.classList.remove('valid');
            confirmStatus.innerHTML = '<i class="ph-fill ph-x-circle"></i>';
        }
    }

    regConfirm.addEventListener('input', () => {
        checkPasswordMatch();
        clearError('register-error');
    });

    // ════════════════════════════════════════════════════════
    // LIVE EMAIL FORMAT CHECK
    // ════════════════════════════════════════════════════════
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    regEmail.addEventListener('input', () => {
        const valid = emailRegex.test(regEmail.value.trim());
        if (regEmail.value.length === 0) {
            emailStatus.textContent = '';
            emailStatus.className = 'field-status';
        } else if (valid) {
            emailStatus.innerHTML = '<i class="ph-fill ph-check-circle"></i>';
            emailStatus.className = 'field-status valid';
        } else {
            emailStatus.innerHTML = '<i class="ph-fill ph-x-circle"></i>';
            emailStatus.className = 'field-status invalid';
        }
        clearError('register-error');
    });

    // ════════════════════════════════════════════════════════
    // REGISTRATION SUBMIT
    // ════════════════════════════════════════════════════════
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError('register-error');

        const name = regName.value.trim();
        const email = regEmail.value.trim().toLowerCase();
        const phone = regPhone.value.trim();
        const pass = regPass.value;
        const confirm = regConfirm.value;
        const btn = document.getElementById('reg-submit-btn');

        // Validation
        if (!name || !email || !phone || !pass || !confirm) {
            showError(registerForm, 'register-error', 'All fields are required.');
            return;
        }
        if (!emailRegex.test(email)) {
            showError(registerForm, 'register-error', 'Please enter a valid email address.');
            return;
        }

        // Check all 4 complexity rules
        const passOk = pass.length >= 8 &&
            /[A-Z]/.test(pass) &&
            /[0-9]/.test(pass) &&
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
        if (!passOk) {
            showError(registerForm, 'register-error', 'Password does not meet the requirements above.');
            return;
        }

        if (pass !== confirm) {
            showError(registerForm, 'register-error', 'Passwords do not match.');
            return;
        }

        setLoading(btn, true);

        // Transition to OTP Screen
        setTimeout(() => {
            setLoading(btn, false);
            pendingUser = { name, email, phone, password: pass };
            userEmailDisplay.textContent = email;
            // Sync mobile OTP email hint
            const mobileEmailEl = document.getElementById('user-email-display-mobile');
            if (mobileEmailEl) mobileEmailEl.textContent = email;
            showScreen(otpScreen);
            otpInputs[0].focus();
        }, 1200);
    });

    // ════════════════════════════════════════════════════════
    // LOGIN SUBMIT
    // ════════════════════════════════════════════════════════
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError('login-error');

        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('.submit-btn');

        if (!email || !pass) {
            showError(loginForm, 'login-error', 'Please fill in both fields.');
            return;
        }

        setLoading(btn, true);

        // Login API call
        fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password: pass })
        })
            .then(async response => {
                const data = await response.json();
                setLoading(btn, false);

                if (response.ok && data.success) {
                    // Save token and name to minimal session
                    localStorage.setItem('gt_auth', 'true');
                    localStorage.setItem('gt_userName', data.user.name);
                    localStorage.setItem('gt_token', data.token); // Store JWT
                    showWelcomeBack(data.user.name);
                } else {
                    showError(loginForm, 'login-error', data.message || 'Invalid login credentials.');
                }
            })
            .catch(error => {
                setLoading(btn, false);
                console.error('Login Error:', error);
                if (error.message === 'Failed to fetch') {
                    showError(loginForm, 'login-error', 'Cannot connect to server. Please ensure the backend is running on port 5000.');
                } else {
                    showError(loginForm, 'login-error', 'Server error. Please try again later.');
                }
            });
    });

    // ════════════════════════════════════════════════════════
    // OTP INPUTS — auto-advance & backspace navigation
    // ════════════════════════════════════════════════════════
    otpInputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            // Only allow digits
            input.value = input.value.replace(/[^0-9]/g, '');
            if (input.value.length === 1) {
                input.classList.add('filled');
                if (idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
            } else {
                input.classList.remove('filled');
            }
            clearError('otp-error');
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
                otpInputs[idx - 1].focus();
                otpInputs[idx - 1].value = '';
                otpInputs[idx - 1].classList.remove('filled');
            }
        });

        // Handle paste — distribute digits across inputs
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            pasted.split('').forEach((digit, i) => {
                if (otpInputs[idx + i]) {
                    otpInputs[idx + i].value = digit;
                    otpInputs[idx + i].classList.add('filled');
                }
            });
            const nextEmpty = Array.from(otpInputs).find(inp => !inp.value);
            if (nextEmpty) nextEmpty.focus();
        });
    });

    // ════════════════════════════════════════════════════════
    // OTP VERIFY — Continue to Dashboard
    // ════════════════════════════════════════════════════════
    verifyOtpBtn.addEventListener('click', () => {
        clearError('otp-error');

        const otp = Array.from(otpInputs).map(i => i.value).join('');

        if (otp.length < 6) {
            showError(otpScreen, 'otp-error', 'Please enter the complete 6-digit code.');
            return;
        }

        setLoading(verifyOtpBtn, true);

        // Verify with backend
        setTimeout(() => {
            if (otp === '123456') {
                if (pendingUser) {
                    // Call backend API finally
                    fetch(`${API_BASE}/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(pendingUser)
                    })
                        .then(async response => {
                            const data = await response.json();
                            setLoading(verifyOtpBtn, false);

                            if (response.ok) {
                                // Minimal session storage as per request
                                localStorage.setItem('gt_auth', 'true');
                                localStorage.setItem('gt_userName', pendingUser.name);
                                pendingUser = null;
                                showSuccessAndRedirect();
                            } else {
                                showError(otpScreen, 'otp-error', data.message || 'Registration failed.');
                            }
                        })
                        .catch(error => {
                            setLoading(verifyOtpBtn, false);
                            console.error('Error:', error);
                            showError(otpScreen, 'otp-error', 'Server error. Please try again later.');
                        });
                }
            } else {
                setLoading(verifyOtpBtn, false);
                showError(otpScreen, 'otp-error', 'Invalid code. Please enter the correct OTP.');
                otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
                otpInputs[0].focus();
            }
        }, 1500);
    });

    resendOtpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const hint = document.getElementById('otp-hint');
        hint.textContent = '✅ OTP resent! (Use 123456 for this demo)';
        hint.style.color = 'var(--success)';
    });

    // ════════════════════════════════════════════════════════
    // SUCCESS + REDIRECT
    // ════════════════════════════════════════════════════════

    // Called after registration OTP verified
    function showSuccessAndRedirect() {
        successOverlay.innerHTML = `
            <div class="success-checkmark">
                <i class="ph-fill ph-check-circle"></i>
            </div>
            <div class="success-text">Registration Complete!</div>
            <p>Setting up your workspace…</p>
        `;
        successOverlay.className = 'success-overlay reg-success active';
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2200);
    }

    // Called on successful login
    function showWelcomeBack(name) {
        const firstName = name ? name.split(' ')[0] : 'there';
        successOverlay.innerHTML = `
            <div class="welcome-back-anim">
                <div class="wb-ring"></div>
                <div class="wb-ring wb-ring-2"></div>
                <i class="ph-fill ph-user-circle wb-icon"></i>
            </div>
            <div class="wb-greeting">Welcome back,</div>
            <div class="wb-name">${firstName}!</div>
            <p class="wb-sub">Taking you to your dashboard…</p>
        `;
        successOverlay.className = 'success-overlay login-success active';
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2200);
    }

});
