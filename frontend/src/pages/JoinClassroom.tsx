import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FiBookOpen, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiArrowLeft, 
  FiLock, 
  FiMail, 
  FiPhone, 
  FiKey, 
  FiUser, 
  FiUsers, 
  FiAward 
} from 'react-icons/fi';
import type { RootState } from '../store';
import { setCredentials } from '../store/authSlice';
import api from '../services/api';

const JoinClassroom: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
 
  // Read search params for role override
  const [searchParams] = useSearchParams();
  const queryRole = searchParams.get('role');

  // General States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Enrollment Status States for Authenticated Teachers
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'not_joined' | 'pending' | 'approved' | null>(null);
  const [resolvedClassroomDbId, setResolvedClassroomDbId] = useState<number | null>(null);

  // Tabs (signup vs login)
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');

  // Wizard Onboarding Step (1 to 6)
  const [wizardStep, setWizardStep] = useState(1);

  // Step 1: Phone
  const [regPhone, setRegPhone] = useState('');

  // Step 2: OTP Verification
  const [otpInput, setOtpInput] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Step 3: Password
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Step 4: Role Selection
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(
    queryRole === 'student' || queryRole === 'teacher' ? queryRole : 'teacher'
  );

  // Step 5: Profile Info
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileBatch, setProfileBatch] = useState('');

  // Login states
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>(
    queryRole === 'student' ? 'password' : 'otp'
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpHelp, setLoginOtpHelp] = useState<string | null>(null);

  useEffect(() => {
    // Save target classroom ID for redirected auto-join
    if (!token && classroomId) {
      localStorage.setItem('pending_join_classroom_id', classroomId);
    }
  }, [token, classroomId]);

  // Status check for authenticated teachers on mount/token change
  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      if (!token || !classroomId || (user?.role !== 'teacher' && user?.role !== 'student')) return;

      setCheckingStatus(true);
      setError(null);
      try {
        const response = await api.get(`/classrooms/status/${classroomId}`);
        setJoinStatus(response.data.status);
        setResolvedClassroomDbId(response.data.classroom.id);

        // Auto-redirect if already approved
        if (response.data.status === 'approved') {
          navigate(`/classrooms/${response.data.classroom.id}`);
        }
      } catch (err: any) {
        console.error('Error fetching classroom join status:', err);
        if (err.response?.status !== 404) {
          setError(err.response?.data?.message || 'Failed to check join status.');
        }
      } finally {
        setCheckingStatus(false);
      }
    };

    checkEnrollmentStatus();
  }, [token, classroomId, user, navigate]);

  const handleJoinRequest = async () => {
    if (!token) return;

    if (user?.role !== 'teacher' && user?.role !== 'student') {
      setError('Only teachers and students are allowed to join classrooms.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await api.post('/classrooms/join', { classroomId });
      setSuccessMsg(response.data.message);
      setJoinStatus('pending');
      localStorage.removeItem('pending_join_classroom_id');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit join request.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1 handler: Phone signup
  const handleStep1PhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPhone) {
      setError('Phone number is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await api.post('/classrooms/join/signup-step1', {
        phone: regPhone,
        classroomId
      });
      setDevOtp(response.data.otpCode);
      setWizardStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 handler: Verify OTP
  const handleStep2OtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput) {
      setError('OTP code is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/classrooms/join/signup-step2', {
        phone: regPhone,
        otp: otpInput
      });
      setWizardStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'OTP verification failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3 handler: Setup Password
  const handleStep3PasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPassword || !regConfirmPassword) {
      setError('All password fields are required.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/classrooms/join/signup-step3', {
        phone: regPhone,
        password: regPassword
      });
      
      if (queryRole === 'student' || queryRole === 'teacher') {
        setSelectedRole(queryRole);
        setWizardStep(5);
      } else {
        setWizardStep(4);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Password registration failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4 handler: Role Selection
  const handleStep4RoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select your role.');
      return;
    }
    setWizardStep(5);
  };

  // Step 5 handler: Profile setup
  const handleStep5ProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileUsername || !profileEmail || (selectedRole === 'student' && !profileBatch)) {
      setError('Please fill in all profile details.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/classrooms/join/signup-step4', {
        phone: regPhone,
        role: selectedRole,
        name: profileName,
        username: profileUsername,
        email: profileEmail,
        classroomId,
        batch: selectedRole === 'student' ? profileBatch : null
      });

      setSuccessMsg('Onboarding completed successfully! Your join request has been submitted.');
      localStorage.removeItem('pending_join_classroom_id');
      setWizardStep(6);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Profile save failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // OTP Login handlers
  const handleSendLoginOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!loginPhone) {
      setError('Please enter your phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await api.post('/auth/send-otp', { phone: loginPhone });
      setLoginOtpSent(true);
      setLoginOtpHelp(response.data.otpCode);
      setSuccessMsg('OTP code generated. Enter it below.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyLoginOtpAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginOtp) {
      setError('Please enter phone and OTP.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const verifyResponse = await api.post('/auth/verify-otp', {
        phone: loginPhone,
        otp: loginOtp
      });

      const { token: userToken, user: loggedUser, organization } = verifyResponse.data;

      // Login in Redux
      dispatch(setCredentials({ token: userToken, user: loggedUser, organization }));

      // Request join immediately
      const joinResponse = await api.post('/classrooms/join', { classroomId });
      setSuccessMsg(joinResponse.data.message);
      setJoinStatus('pending');
      localStorage.removeItem('pending_join_classroom_id');
      setLoginOtpSent(false);
      setLoginOtpHelp(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'OTP Login failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Traditional Password login
  const handlePasswordLoginAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const loginResponse = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword
      });

      const { token: userToken, user: loggedUser, organization } = loginResponse.data;

      // Login in Redux
      dispatch(setCredentials({ token: userToken, user: loggedUser, organization }));

      // Request join immediately
      const joinResponse = await api.post('/classrooms/join', { classroomId });
      setSuccessMsg(joinResponse.data.message);
      setJoinStatus('pending');
      localStorage.removeItem('pending_join_classroom_id');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getWizardStepTitle = () => {
    switch(wizardStep) {
      case 1: return 'Step 1 of 5: Enter Phone Number';
      case 2: return 'Step 2 of 5: Verify OTP';
      case 3: return 'Step 3 of 5: Set Account Password';
      case 4: return 'Step 4 of 5: Select Your Role';
      case 5: return 'Step 5 of 5: Configure Profile';
      default: return 'Signup Completed';
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glass-card" style={{ maxWidth: '540px', textAlign: 'center', padding: '32px' }}>
        
        {/* Header Icon */}
        <div style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '50%', 
          background: 'rgba(79, 70, 229, 0.12)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'var(--primary)',
          margin: '0 auto 16px'
        }}>
          <FiBookOpen size={30} />
        </div>

        <h3 className="form-title" style={{ fontSize: '22px', marginBottom: '4px' }}>Classroom Join Request</h3>
        <p className="form-subtitle" style={{ fontSize: '13px', marginBottom: '24px', color: '#64748b' }}>
          Classroom ID: <strong style={{ color: '#4f46e5', fontWeight: '700' }}>{classroomId}</strong>
        </p>

        {error && (
          <div className="alert alert-error" style={{ margin: '16px 0', textAlign: 'left' }}>
            <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && wizardStep !== 6 && (
          <div className="alert alert-success" style={{ margin: '16px 0', textAlign: 'left' }}>
            <FiCheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Authenticated Flow */}
        {token && (
          checkingStatus ? (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <span className="spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--primary)' }}></span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Checking enrollment status...</span>
            </div>
          ) : (user?.role !== 'teacher' && user?.role !== 'student') ? (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                You are currently logged in as <strong style={{ color: 'white' }}>{user?.name} ({user?.role})</strong>. Only teachers and students can join classrooms.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                <FiArrowLeft size={18} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          ) : joinStatus === 'approved' ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--success)',
                margin: '0 auto 16px'
              }}>
                <FiCheckCircle size={28} />
              </div>
              <h4 style={{ color: 'white', marginBottom: '8px' }}>Request Approved!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Your join request has been accepted. You are now an active {user?.role} in this classroom.
              </p>
              <button className="btn" onClick={() => navigate(`/classrooms/${resolvedClassroomDbId}`)}>
                <span>Go to Classroom</span>
              </button>
            </div>
          ) : joinStatus === 'pending' ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: 'rgba(245, 158, 11, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--warning)',
                margin: '0 auto 16px'
              }}>
                <FiKey size={28} />
              </div>
              <h4 style={{ color: 'white', marginBottom: '8px' }}>Join Request Pending</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Your request is currently waiting for administrator approval. Once approved, you can enter the classroom.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                <FiArrowLeft size={18} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Logged in as <strong style={{ color: 'white' }}>{user?.name} ({user?.role === 'teacher' ? 'Teacher' : 'Student'})</strong>. Click the button below to submit a join request.
              </p>
              <button className="btn" onClick={handleJoinRequest} disabled={submitting}>
                {submitting ? <span className="spinner"></span> : <span>Request to Join Classroom</span>}
              </button>
            </div>
          )
        )}

        {/* Unauthenticated Wizard Flow */}
        {!token && authTab === 'signup' && (
          <div>
            {/* Step Wizard Header */}
            {wizardStep < 6 && (
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {getWizardStepTitle()}
                </span>
                {/* Stepper Progress Bar */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div 
                      key={s} 
                      style={{ 
                        flex: 1, 
                        height: '100%', 
                        backgroundColor: s <= wizardStep ? 'var(--primary)' : 'transparent',
                        transition: 'background-color 0.3s ease'
                      }} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Phone input */}
            {wizardStep === 1 && (
              <form onSubmit={handleStep1PhoneSubmit} style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Let's verify your device. Enter your phone number below to receive a registration code.
                </p>
                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="phone1">Phone Number *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="tel"
                      id="phone1"
                      placeholder="e.g. +1234567890"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                    />
                    <FiPhone className="input-icon" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="form-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, color: '#4f46e5', fontWeight: 600 }}
                    onClick={() => setAuthTab('login')}
                  >
                    I already have an account
                  </button>
                  <button className="btn" type="submit" style={{ width: 'auto', padding: '0 24px' }} disabled={submitting}>
                    {submitting ? <span className="spinner"></span> : <span>Send OTP</span>}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {wizardStep === 2 && (
              <form onSubmit={handleStep2OtpSubmit} style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  We sent a 6-digit OTP code to <strong style={{ color: 'white' }}>{regPhone}</strong>.
                </p>

                {devOtp && (
                  <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', border: '1px dashed var(--primary)', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--primary)' }}>🧪 Developer Mock OTP:</strong><br />
                    Use code <strong style={{ color: 'white', fontSize: '16px', letterSpacing: '2px' }}>{devOtp}</strong> to verify this phone number.
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="otp">Enter 6-Digit OTP *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="text"
                      id="otp"
                      placeholder="123456"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      required
                    />
                    <FiKey className="input-icon" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWizardStep(1)} disabled={submitting}>
                    Back
                  </button>
                  <button className="btn" type="submit" style={{ flex: 2 }} disabled={submitting}>
                    {submitting ? <span className="spinner"></span> : <span>Verify OTP</span>}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Setup Password */}
            {wizardStep === 3 && (
              <form onSubmit={handleStep3PasswordSubmit} style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  OTP verified successfully! Now create a secure password to protect your account.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="pass">Create Password *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="password"
                      id="pass"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                    <FiLock className="input-icon" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="passConf">Confirm Password *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="password"
                      id="passConf"
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                    />
                    <FiLock className="input-icon" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWizardStep(2)} disabled={submitting}>
                    Back
                  </button>
                  <button className="btn" type="submit" style={{ flex: 2 }} disabled={submitting}>
                    {submitting ? <span className="spinner"></span> : <span>Save Password</span>}
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Role Selection */}
            {wizardStep === 4 && (
              <form onSubmit={handleStep4RoleSubmit} style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Select your role in the classroom. This determines your permissions.
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
                  {/* Join as Teacher Card */}
                  <div 
                    onClick={() => setSelectedRole('teacher')}
                    style={{ 
                      flex: 1, 
                      padding: '20px', 
                      borderRadius: '12px', 
                      border: selectedRole === 'teacher' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedRole === 'teacher' ? 'rgba(79, 70, 229, 0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FiAward size={32} style={{ color: selectedRole === 'teacher' ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '12px' }} />
                    <h4 style={{ color: selectedRole === 'teacher' ? 'white' : 'var(--text-primary)', marginBottom: '6px' }}>Join as Teacher</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Instruct, manage assignments, and configure settings.</p>
                  </div>

                  {/* Join as Student Card */}
                  <div 
                    onClick={() => setSelectedRole('student')}
                    style={{ 
                      flex: 1, 
                      padding: '20px', 
                      borderRadius: '12px', 
                      border: selectedRole === 'student' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedRole === 'student' ? 'rgba(79, 70, 229, 0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FiUsers size={32} style={{ color: selectedRole === 'student' ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '12px' }} />
                    <h4 style={{ color: selectedRole === 'student' ? 'white' : 'var(--text-primary)', marginBottom: '6px' }}>Join as Student</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Attend lectures, submit work, and view materials.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWizardStep(3)}>
                    Back
                  </button>
                  <button className="btn" type="submit" style={{ flex: 2 }}>
                    <span>Next Step</span>
                  </button>
                </div>
              </form>
            )}

            {/* Step 5: Complete Profile details */}
            {wizardStep === 5 && (
              <form onSubmit={handleStep5ProfileSubmit} style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Configure your profile credentials below. These details will represent your digital identity.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="profName">Full Name *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="text"
                      id="profName"
                      placeholder="e.g. Professor Smith"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                    <FiUser className="input-icon" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profUsername">Username *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="text"
                      id="profUsername"
                      placeholder="e.g. prof_smith"
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      required
                    />
                    <FiKey className="input-icon" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" htmlFor="profEmail">Email (Gmail) *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="email"
                      id="profEmail"
                      placeholder="e.g. smith@gmail.com"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      required
                    />
                    <FiMail className="input-icon" />
                  </div>
                </div>

                {selectedRole === 'student' && (
                  <div className="form-group" style={{ marginBottom: '28px' }}>
                    <label className="form-label" htmlFor="profBatch">Batch / Section (e.g. Batch A) *</label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="text"
                        id="profBatch"
                        placeholder="e.g. Batch A"
                        value={profileBatch}
                        onChange={(e) => setProfileBatch(e.target.value)}
                        required={selectedRole === 'student'}
                      />
                      <FiUsers className="input-icon" />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      if (queryRole === 'student' || queryRole === 'teacher') {
                        setWizardStep(3);
                      } else {
                        setWizardStep(4);
                      }
                    }} 
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button className="btn" type="submit" style={{ flex: 2 }} disabled={submitting}>
                    {submitting ? <span className="spinner"></span> : <span>Complete Signup</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Step 6: Success Screen (Pending Admin Review) */}
        {!token && authTab === 'signup' && wizardStep === 6 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.12)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--success)',
              margin: '0 auto 20px'
            }}>
              <FiCheckCircle size={32} />
            </div>

            <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '12px' }}>Onboarding Completed!</h3>
            
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '28px' }}>
              Your account is successfully created and active. A request to join the classroom has been sent to the administrator. 
              Please log in and wait for the administrator's approval to enter the classroom.
            </p>

            <button 
              className="btn" 
              onClick={() => {
                setAuthTab('login');
                setWizardStep(1);
                setSuccessMsg(null);
                setLoginPhone(regPhone);
              }}
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Unauthenticated Login Flow */}
        {!token && authTab === 'login' && (
          <div>
            {/* Main Tabs (Create Account vs Log In) */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '24px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: (authTab as string) === 'signup' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: (authTab as string) === 'signup' ? '#4f46e5' : '#64748b',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  boxShadow: (authTab as string) === 'signup' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => { setError(null); setSuccessMsg(null); setAuthTab('signup'); setWizardStep(1); }}
              >
                Create Account
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: authTab === 'login' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: authTab === 'login' ? '#4f46e5' : '#64748b',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  boxShadow: authTab === 'login' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Log In
              </button>
            </div>

            {/* Segmented controls for Login Methods (only show toggle if not student invite link) */}
            {queryRole !== 'student' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: loginMethod === 'otp' ? '#4f46e5' : 'transparent',
                    border: 'none',
                    color: loginMethod === 'otp' ? '#ffffff' : '#64748b',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => { setError(null); setSuccessMsg(null); setLoginMethod('otp'); }}
                >
                  Teacher OTP Login
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: loginMethod === 'password' ? '#4f46e5' : 'transparent',
                    border: 'none',
                    color: loginMethod === 'password' ? '#ffffff' : '#64748b',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => { setError(null); setSuccessMsg(null); setLoginMethod('password'); }}
                >
                  Password Login
                </button>
              </div>
            )}

            {/* OTP Login Form */}
            {loginMethod === 'otp' && (
              <form onSubmit={handleVerifyLoginOtpAndJoin} style={{ textAlign: 'left' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="loginPhone">Phone Number *</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="input-wrapper" style={{ flex: 1 }}>
                      <input
                        className="form-input"
                        type="tel"
                        id="loginPhone"
                        placeholder="e.g. +1234567890"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                        disabled={loginOtpSent}
                      />
                      <FiPhone className="input-icon" />
                    </div>
                    {!loginOtpSent && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ 
                          width: 'auto', 
                          flexShrink: 0, 
                          padding: '0 20px', 
                          margin: 0, 
                          height: '44px',
                          whiteSpace: 'nowrap',
                          fontSize: '13px'
                        }}
                        onClick={handleSendLoginOtp}
                        disabled={submitting || !loginPhone}
                      >
                        Send OTP
                      </button>
                    )}
                  </div>
                </div>

                {loginOtpSent && (
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label" htmlFor="loginOtp">OTP Code *</label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="text"
                        id="loginOtp"
                        placeholder="123456"
                        maxLength={6}
                        value={loginOtp}
                        onChange={(e) => setLoginOtp(e.target.value)}
                        required
                      />
                      <FiKey className="input-icon" />
                    </div>
                    {loginOtpHelp && (
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
                        🧪 Testing OTP: <strong style={{ color: '#4f46e5' }}>{loginOtpHelp}</strong>
                      </span>
                    )}
                  </div>
                )}

                {loginOtpSent && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setLoginOtpSent(false);
                        setLoginOtpHelp(null);
                        setLoginOtp('');
                        setError(null);
                      }}
                    >
                      Change Phone
                    </button>
                    <button className="btn" type="submit" style={{ flex: 2 }} disabled={submitting}>
                      {submitting ? <span className="spinner"></span> : <span>Log In & Join</span>}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Password Login Form (Traditional) */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLoginAndJoin} style={{ textAlign: 'left' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="loginEmail">Email, Phone, or Username *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="text"
                      id="loginEmail"
                      placeholder="Email, phone, or username"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                    <FiMail className="input-icon" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="loginPassword">Password *</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type="password"
                      id="loginPassword"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <FiLock className="input-icon" />
                  </div>
                </div>

                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : <span>Log In & Join</span>}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinClassroom;
