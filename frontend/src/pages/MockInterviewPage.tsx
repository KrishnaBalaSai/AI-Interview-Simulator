import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Clock,
  RotateCcw,
  Edit3,
  Video,
  VideoOff,
  Pause,
  Play,
  PhoneOff,
  AlertTriangle,
  ShieldAlert,
  Maximize2,
  Minimize2,
  EyeOff,
  CheckCircle2,
  Camera,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { interviewService } from '../services/api';
import {
  InterviewDetail,
  InterviewQuestionItem,
  InterviewRoomState,
} from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const MockInterviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = Number(id);

  // Core Data
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomState, setRoomState] = useState<InterviewRoomState>('INITIALIZING');

  // Pre-Interview Permissions & Device Check Lobby
  const [hasStarted, setHasStarted] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [deviceCheckError, setDeviceCheckError] = useState<string | null>(null);
  const [checkingDevices, setCheckingDevices] = useState(false);

  // Answer & Transcript
  const [answer, setAnswer] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isTypingFallback, setIsTypingFallback] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timers
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);

  // Voice & Recognition State
  const [isListening, setIsListening] = useState(false);
  const [isMicMutedByUser, setIsMicMutedByUser] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  // Webcam preview
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Inactivity & Heartbeat
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(30);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Fullscreen & Tab Switch Tracking (Upto 2 warnings allowed; 3rd auto-submits)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [isTerminatedDueToTabSwitch, setIsTerminatedDueToTabSwitch] = useState(false);

  // Robust Control Refs
  const tabSwitchCountRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef(false);
  const isMicMutedByUserRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const roomStateRef = useRef<InterviewRoomState>('INITIALIZING');
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentQuestionIdRef = useRef<number | null>(null);
  const restartTimerRef = useRef<any>(null);
  const ttsKeepAliveTimerRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const mountedRef = useRef(true);
  const hasStartedRef = useRef(false);
  const interviewRef = useRef<InterviewDetail | null>(null);
  const handleAutoSubmitRef = useRef<(reason: string) => Promise<void>>(() => Promise.resolve());

  // Sync refs with state
  interviewRef.current = interview;
  roomStateRef.current = roomState;
  isMicMutedByUserRef.current = isMicMutedByUser;
  hasStartedRef.current = hasStarted;

  // Master Hardware & Stream Shutdown Helper
  const releaseAllHardwareAndMedia = useCallback(() => {
    // 1. Cancel speech recognition & restart timer
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isRecognizingRef.current = false;
    setIsListening(false);

    // 2. Cancel TTS speech synthesis
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // 3. Completely stop & disable all camera and mic tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {}
      });
      mediaStreamRef.current = null;
    }

    // 4. Detach stream from video elements to release hardware lock
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = null;
    }

    // 5. Update state flags
    setCameraEnabled(false);
    hasStartedRef.current = false;
  }, []);

  // 1. Initial Load & Fetch Interview
  useEffect(() => {
    mountedRef.current = true;
    fetchInterview();

    // Ensure pre-interview lobby is in normal window mode so media permission prompts are unobstructed
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      if (ttsKeepAliveTimerRef.current) clearInterval(ttsKeepAliveTimerRef.current);
      releaseAllHardwareAndMedia();
    };
  }, [interviewId, releaseAllHardwareAndMedia]);

  const fetchInterview = async () => {
    try {
      setLoading(true);
      const data = await interviewService.getInterview(interviewId);
      if (!mountedRef.current) return;
      setInterview(data);

      if (data.status === 'completed' || data.status === 'auto_submitted') {
        releaseAllHardwareAndMedia();
        navigate(`/interview/report/${data.id}`);
        return;
      }

      const activeQ = data.current_question || data.questions[0];
      setCurrentQuestion(activeQ);
    } catch (err) {
      console.error('Failed to load interview', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // 2. Request Media Device Permissions (Microphone & Camera)
  const requestDevicePermissions = async () => {
    setCheckingDevices(true);
    setDeviceCheckError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDeviceCheckError('Your browser does not support media device capture.');
        setCheckingDevices(false);
        return false;
      }

      // First attempt: both video and audio
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        });
        setMicPermission('granted');
        setCameraPermission('granted');
        setCameraEnabled(true);
      } catch (err: any) {
        // Fallback: test audio only if camera is blocked or not connected
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicPermission('granted');
          setCameraPermission('denied');
          setCameraEnabled(false);
          setDeviceCheckError('Camera unavailable or permission denied. Proceeding with microphone only.');
        } catch (audioErr) {
          setMicPermission('denied');
          setCameraPermission('denied');
          setDeviceCheckError('Microphone permission is required to conduct the mock interview. Please allow access.');
          setCheckingDevices(false);
          return false;
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        if (lobbyVideoRef.current && cameraPermission === 'granted') {
          lobbyVideoRef.current.srcObject = stream;
        }
      }

      setCheckingDevices(false);
      return true;
    } catch (e: any) {
      setDeviceCheckError(e.message || 'Permission check failed.');
      setCheckingDevices(false);
      return false;
    }
  };

  // Run initial check on device permissions on mount
  useEffect(() => {
    requestDevicePermissions();
  }, []);

  // Bind media stream to active video element
  useEffect(() => {
    if (mediaStreamRef.current) {
      if (hasStarted && videoRef.current && cameraEnabled) {
        videoRef.current.srcObject = mediaStreamRef.current;
      } else if (!hasStarted && lobbyVideoRef.current && cameraPermission === 'granted') {
        lobbyVideoRef.current.srcObject = mediaStreamRef.current;
      }
    }
  }, [hasStarted, cameraEnabled, cameraPermission]);

  // 3. User Confirms Permissions & Starts Interview
  const handleStartInterview = async () => {
    // Check if mic is granted
    if (micPermission !== 'granted') {
      const granted = await requestDevicePermissions();
      if (!granted) return;
    }

    // Request Browser Fullscreen on user click gesture
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }

    setHasStarted(true);
    hasStartedRef.current = true;
    lastActivityRef.current = Date.now();
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle caught', err);
    }
  };

  // 4. Microphone Helpers
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isRecognizingRef.current || isMicMutedByUserRef.current || !hasStartedRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.name !== 'InvalidStateError') {
        console.warn('Speech recognition start error:', err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isRecognizingRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Speech recognition stop error:', err);
    }
  }, []);

  // 5. Auto Submit Handler (Rock-solid with timeout race and instant navigation)
  const handleAutoSubmit = useCallback(async (reason: string) => {
    const targetId = interviewRef.current?.id || interviewId;
    if (!targetId) return;

    try {
      setRoomState('COMPLETED');
      roomStateRef.current = 'COMPLETED';

      // 1. Immediately turn off all hardware, camera, mic, and speech recognition
      releaseAllHardwareAndMedia();

      // 2. Exit browser fullscreen if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      // 3. Trigger auto-submit API with 2.5s maximum timeout race
      await Promise.race([
        interviewService.autoSubmit(targetId, reason),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch (err) {
      console.error('Auto-submit failed:', err);
    } finally {
      // 4. Unconditionally navigate to the evaluation report
      navigate(`/interview/report/${targetId}`);
    }
  }, [interviewId, navigate, releaseAllHardwareAndMedia]);

  handleAutoSubmitRef.current = handleAutoSubmit;

  // 6. Tab Switch & Visibility Detection (2 Warnings Allowed; 3rd Auto-Submits)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only monitor once interview has officially started
      if (!hasStartedRef.current) return;

      if (document.visibilityState === 'hidden') {
        if (
          mountedRef.current &&
          roomStateRef.current !== 'COMPLETED' &&
          roomStateRef.current !== 'PAUSED'
        ) {
          tabSwitchCountRef.current += 1;
          const currentSwitches = tabSwitchCountRef.current;
          setTabSwitchCount(currentSwitches);

          // Immediately pause audio and microphone
          if (window.speechSynthesis) window.speechSynthesis.pause();
          stopListening();
          setRoomState('PAUSED');

          // Strict enforcement: Up to 2 warning excuses; 3rd auto-submits!
          if (currentSwitches >= 3) {
            setIsTerminatedDueToTabSwitch(true);
            handleAutoSubmitRef.current(
              'Terminated: Exceeded tab switch limit (3 tab switch violations detected)'
            );
          } else {
            setShowTabSwitchWarning(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopListening]);

  const handleResumeFromTabSwitch = () => {
    setShowTabSwitchWarning(false);
    registerActivity();

    // Re-engage browser fullscreen
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    if (isSpeakingRef.current && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setRoomState('AI_SPEAKING');
    } else {
      setRoomState('LISTENING');
      if (!isMicMutedByUserRef.current) {
        startListening();
      }
    }
  };

  // 6. Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      setIsTypingFallback(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      registerActivity();
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart + ' ';
        } else {
          interim += transcriptPart;
        }
      }

      if (final) {
        setAnswer((prev) => (prev ? `${prev.trim()} ${final.trim()}` : final.trim()));
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isRecognizingRef.current = false;
        setIsTypingFallback(true);
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setIsListening(false);

      if (
        mountedRef.current &&
        hasStartedRef.current &&
        roomStateRef.current === 'LISTENING' &&
        !isMicMutedByUserRef.current &&
        !isSpeakingRef.current
      ) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (
            mountedRef.current &&
            hasStartedRef.current &&
            roomStateRef.current === 'LISTENING' &&
            !isMicMutedByUserRef.current &&
            !isSpeakingRef.current
          ) {
            startListening();
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, [startListening]);

  // 7. AI Text-to-Speech (SpeechSynthesis)
  const speakQuestion = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setRoomState('LISTENING');
      if (!isMicMutedByUserRef.current) startListening();
      return;
    }

    stopListening();
    window.speechSynthesis.cancel();
    if (ttsKeepAliveTimerRef.current) clearInterval(ttsKeepAliveTimerRef.current);

    setTimeout(() => {
      if (!mountedRef.current || !hasStartedRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Jenny') ||
            v.name.includes('Neural'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onstart = () => {
        if (!mountedRef.current) return;
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        setRoomState('AI_SPEAKING');

        if (ttsKeepAliveTimerRef.current) clearInterval(ttsKeepAliveTimerRef.current);
        ttsKeepAliveTimerRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      };

      utterance.onend = () => {
        if (!mountedRef.current) return;
        if (ttsKeepAliveTimerRef.current) clearInterval(ttsKeepAliveTimerRef.current);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        currentUtteranceRef.current = null;

        if (roomStateRef.current !== 'PAUSED') {
          setRoomState('LISTENING');
          if (!isMicMutedByUserRef.current) {
            startListening();
          }
        }
      };

      utterance.onerror = (e) => {
        if (ttsKeepAliveTimerRef.current) clearInterval(ttsKeepAliveTimerRef.current);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        currentUtteranceRef.current = null;

        if (roomStateRef.current !== 'PAUSED') {
          setRoomState('LISTENING');
          if (!isMicMutedByUserRef.current) {
            startListening();
          }
        }
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, 80);
  }, [startListening, stopListening]);

  // 8. Speak Question ONLY after interview has officially started
  useEffect(() => {
    if (!currentQuestion || loading || !hasStarted) return;

    if (currentQuestionIdRef.current === currentQuestion.id) return;
    currentQuestionIdRef.current = currentQuestion.id;

    setQuestionSeconds(0);
    setAnswer('');
    setInterimTranscript('');

    const timer = setTimeout(() => {
      speakQuestion(currentQuestion.question_text);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentQuestion?.id, loading, hasStarted, speakQuestion]);

  // 9. Session & Question Timers (Active only after start)
  useEffect(() => {
    if (!hasStarted || roomState === 'PAUSED' || roomState === 'COMPLETED' || loading) return;

    const interval = setInterval(() => {
      setSessionSeconds((s) => s + 1);
      if (roomState === 'LISTENING' || roomState === 'AI_SPEAKING') {
        setQuestionSeconds((q) => q + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, roomState, loading]);

  // 10. Heartbeat
  useEffect(() => {
    if (!hasStarted || !interview || interview.status !== 'in_progress') return;

    const hbInterval = setInterval(async () => {
      try {
        await interviewService.heartbeat(interview.id);
      } catch (err) {
        console.warn('Heartbeat ping failed', err);
      }
    }, 25000);

    return () => clearInterval(hbInterval);
  }, [hasStarted, interview]);

  // 11. Inactivity Tracking
  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityWarning) {
      setInactivityWarning(false);
      setInactivityCountdown(30);
    }
  }, [inactivityWarning]);

  useEffect(() => {
    if (!hasStarted) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleEvent = () => registerActivity();

    events.forEach((ev) => window.addEventListener(ev, handleEvent));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleEvent));
    };
  }, [hasStarted, registerActivity]);

  useEffect(() => {
    if (!hasStarted || roomState === 'PAUSED' || roomState === 'COMPLETED' || loading) return;

    const checkInterval = setInterval(() => {
      const elapsedSinceActivity = (Date.now() - lastActivityRef.current) / 1000;

      if (elapsedSinceActivity >= 90 && !inactivityWarning) {
        setInactivityWarning(true);
        setInactivityCountdown(30);
      }

      if (inactivityWarning) {
        setInactivityCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(checkInterval);
            handleAutoSubmitRef.current('Candidate inactive for over 120 seconds');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [hasStarted, roomState, loading, inactivityWarning]);

  // 12. Unload Listener
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasStarted && interview && interview.status === 'in_progress') {
        const token = localStorage.getItem('token');
        const url = `/api/interviews/${interview.id}/auto-submit${token ? `?token=${token}` : ''}`;
        const data = JSON.stringify({ reason: 'Candidate closed or reloaded the browser tab' });

        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: 'POST',
            body: data,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [hasStarted, interviewId]);

  // 14. Manual Submit Answer
  const handleSubmitAnswer = async () => {
    const fullAnswer = `${answer} ${interimTranscript}`.trim();
    if (!fullAnswer || !interview) return;

    setSubmitting(true);
    setRoomState('PROCESSING');
    window.speechSynthesis.cancel();
    stopListening();

    try {
      const res = await interviewService.submitAnswer(interview.id, {
        answer: fullAnswer,
        duration_seconds: questionSeconds,
      });

      if (res.is_completed) {
        setRoomState('COMPLETED');
        roomStateRef.current = 'COMPLETED';

        // Automatically close browser fullscreen upon interview completion
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }

        // Stop and release all microphone and camera devices immediately
        releaseAllHardwareAndMedia();

        setTimeout(() => {
          navigate(`/interview/report/${interview.id}`);
        }, 800);
      } else if (res.next_question) {
        setCurrentQuestion(res.next_question);
        setAnswer('');
        setInterimTranscript('');
      }
    } catch (err) {
      console.error('Failed to submit answer', err);
      alert('Failed to submit answer. Please try again.');
      setRoomState('LISTENING');
    } finally {
      setSubmitting(false);
    }
  };

  // 15. Toggle Mic Mute
  const toggleMicMute = () => {
    if (isMicMutedByUser) {
      setIsMicMutedByUser(false);
      isMicMutedByUserRef.current = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
      }
      if (roomStateRef.current === 'LISTENING') {
        startListening();
      }
    } else {
      setIsMicMutedByUser(true);
      isMicMutedByUserRef.current = true;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      stopListening();
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    setCameraEnabled((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = next;
        });
      }
      return next;
    });
  };

  // 16. Pause & Resume
  const togglePause = () => {
    if (roomState === 'PAUSED') {
      setRoomState('LISTENING');
      if (!isMicMutedByUserRef.current) {
        startListening();
      }
    } else {
      window.speechSynthesis.cancel();
      stopListening();
      setRoomState('PAUSED');
    }
  };

  // 17. Repeat Question
  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      speakQuestion(currentQuestion.question_text);
    }
  };

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white">
        <LoadingSpinner text="Connecting to AI Interview Studio..." />
      </div>
    );
  }

  if (!interview || !currentQuestion) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Interview Session Not Found</h2>
        <button
          onClick={() => navigate('/interview/setup')}
          className="px-6 py-2.5 bg-indigo-600 rounded-xl font-semibold hover:bg-indigo-700 transition"
        >
          Return to Interview Setup
        </button>
      </div>
    );
  }

  // ==========================================
  // PRE-INTERVIEW PERMISSION CHECK LOBBY VIEW
  // ==========================================
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto w-full space-y-6 my-auto">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pre-Interview Device Check</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hardware & Permissions Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Please grant microphone and camera permissions before starting your <strong>{interview.target_role}</strong> interview.
            </p>
          </div>

          {/* Device Verification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Check */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Camera Test
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      cameraPermission === 'granted'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : cameraPermission === 'denied'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cameraPermission === 'granted' ? 'Camera Active' : cameraPermission === 'denied' ? 'Camera Denied (Optional)' : 'Pending Check'}
                  </span>
                </div>

                <div className="aspect-video bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center relative">
                  {cameraPermission === 'granted' ? (
                    <video
                      ref={lobbyVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-500">
                      <VideoOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Camera preview will appear once permitted.</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Camera feed is used for realistic video simulator cockpit experience.
              </p>
            </div>

            {/* Microphone Check */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Microphone Test
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      micPermission === 'granted'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : micPermission === 'denied'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {micPermission === 'granted' ? 'Microphone Ready' : micPermission === 'denied' ? 'Permission Required' : 'Pending Check'}
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <Mic className={`w-6 h-6 ${micPermission === 'granted' ? 'animate-bounce' : ''}`} />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    {micPermission === 'granted'
                      ? 'Microphone is connected and ready to transcribe your responses.'
                      : 'Please grant microphone access when prompted by the browser.'}
                  </p>
                </div>
              </div>

              {deviceCheckError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>{deviceCheckError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={requestDevicePermissions}
                disabled={checkingDevices}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              >
                {checkingDevices ? 'Requesting Permissions...' : 'Retest Device Permissions'}
              </button>
            </div>
          </div>

          {/* Strict Assessment Protocols */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4" />
              <span>Assessment & Tab Switch Rules</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 pl-5 list-disc leading-relaxed">
              <li>
                <strong>Tab Switching Limit:</strong> You are allowed up to <strong>2 warning excuses</strong>. On the <strong>3rd tab switch</strong>, the interview will be automatically terminated and submitted.
              </li>
              <li>
                <strong>Resume & Greeting:</strong> The AI interviewer will greet you warmly and review your uploaded resume on Question #1 before technical deep dives.
              </li>
              <li>
                <strong>Auto-Fullscreen:</strong> The live interview studio will enter full-screen mode once you confirm device permissions below.
              </li>
            </ul>
          </div>

          {/* Launch CTA */}
          <div className="pt-2">
            <button
              onClick={handleStartInterview}
              disabled={checkingDevices || micPermission === 'denied'}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/20 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Confirm Permissions & Enter Fullscreen Studio</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ACTIVE FULL-SCREEN INTERVIEW STUDIO COCKPIT
  // ==========================================
  const progressPercent = Math.round(
    ((currentQuestion.question_order - 1) / interview.total_questions) * 100
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      {/* HUD Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
              LIVE INTERVIEW
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{interview.target_role}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {interview.interview_type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Difficulty & Timers */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Difficulty:</span>
              <span className="text-indigo-300 font-bold uppercase">{currentQuestion.difficulty}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Total: {formatTime(sessionSeconds)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Browser Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-indigo-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            <button
              onClick={togglePause}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                roomState === 'PAUSED'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {roomState === 'PAUSED' ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Need a Moment</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </header>

      {/* Progress Track */}
      <div className="w-full bg-slate-900 h-1">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: AI Interviewer Presence & Studio Stage */}
        <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* AI Avatar & State HUD */}
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-900/50 border border-slate-800/80 relative overflow-hidden shadow-2xl">
            {/* Ambient Background Glow */}
            <div
              className={`absolute inset-0 transition-opacity duration-1000 blur-3xl pointer-events-none ${
                roomState === 'AI_SPEAKING'
                  ? 'bg-indigo-600/20 opacity-100'
                  : roomState === 'LISTENING'
                  ? 'bg-emerald-500/15 opacity-100'
                  : roomState === 'PROCESSING'
                  ? 'bg-purple-600/20 opacity-100'
                  : 'bg-transparent opacity-0'
              }`}
            />

            {/* Pulsing AI Circle Avatar */}
            <div className="relative flex items-center justify-center mb-6">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-2 transition-all duration-700 ${
                  roomState === 'AI_SPEAKING'
                    ? 'border-indigo-400 shadow-[0_0_50px_rgba(99,102,241,0.5)] scale-105'
                    : roomState === 'LISTENING'
                    ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.3)] scale-100'
                    : roomState === 'PROCESSING'
                    ? 'border-purple-400 animate-spin shadow-[0_0_40px_rgba(168,85,247,0.4)]'
                    : 'border-slate-700 shadow-none'
                } bg-slate-950`}
              >
                {/* Visual Audio Bars / Waves */}
                {roomState === 'AI_SPEAKING' ? (
                  <div className="flex items-center gap-1.5 h-12">
                    {[40, 75, 100, 60, 90, 45, 80].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-indigo-500 to-purple-400 rounded-full animate-pulse"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 120}ms`,
                          animationDuration: '600ms',
                        }}
                      />
                    ))}
                  </div>
                ) : roomState === 'LISTENING' ? (
                  <div className="flex items-center justify-center">
                    <Mic className={`w-10 h-10 ${isListening ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
                  </div>
                ) : roomState === 'PROCESSING' ? (
                  <Sparkles className="w-10 h-10 text-purple-400" />
                ) : (
                  <Pause className="w-10 h-10 text-amber-400" />
                )}
              </div>

              {/* Status Badge */}
              <div className="absolute -bottom-3 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-md bg-slate-950 border border-slate-700 flex items-center gap-2">
                {roomState === 'AI_SPEAKING' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span className="text-indigo-300">AI Speaking...</span>
                  </>
                )}
                {roomState === 'LISTENING' && (
                  <>
                    <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                    <span className={isListening ? 'text-emerald-300' : 'text-slate-400'}>
                      {isListening ? 'Listening to You' : 'Mic Muted'}
                    </span>
                  </>
                )}
                {roomState === 'PROCESSING' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-purple-300">Evaluating Response...</span>
                  </>
                )}
                {roomState === 'PAUSED' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-300">Interview Paused</span>
                  </>
                )}
                {roomState === 'INITIALIZING' && (
                  <span className="text-slate-400">Preparing question...</span>
                )}
              </div>
            </div>

            {/* Question Card */}
            <div className="w-full max-w-2xl bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider text-indigo-400">
                  Question {currentQuestion.question_order} of {interview.total_questions}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold">
                  {currentQuestion.category}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed">
                "{currentQuestion.question_text}"
              </h2>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={handleRepeatQuestion}
                  disabled={roomState === 'PROCESSING'}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Repeat Question</span>
                </button>

                <span className="text-xs font-mono text-slate-400">
                  Response Timer: <strong className="text-white">{formatTime(questionSeconds)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Candidate Live Speech Transcript & Editor Area */}
          <div className="flex-1 flex flex-col bg-slate-900/50 rounded-3xl p-6 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Your Live Transcript & Answer
                </span>
              </div>

              <div className="flex items-center gap-3">
                {recognitionSupported && (
                  <button
                    onClick={toggleMicMute}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      !isMicMutedByUser && isListening
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                    }`}
                  >
                    {!isMicMutedByUser && isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        <span>Mute Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Unmute Mic</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setIsTypingFallback((prev) => !prev)}
                  className="text-xs text-slate-400 hover:text-indigo-300 transition"
                >
                  {isTypingFallback ? 'Hide Keyboard' : 'Type Response'}
                </button>
              </div>
            </div>

            {/* Transcript Textarea */}
            <div className="flex-1 relative">
              <textarea
                value={answer}
                onChange={(e) => {
                  registerActivity();
                  setAnswer(e.target.value);
                }}
                placeholder={
                  isListening
                    ? 'Speak clearly into your microphone... your words will appear here live. You can also edit or type directly.'
                    : 'Your response transcript will appear here. Click Unmute Mic or type directly...'
                }
                rows={5}
                className="w-full h-full min-h-[140px] bg-slate-950/80 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
              />

              {/* Interim Real-time Speech Overlay */}
              {interimTranscript && (
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md rounded-xl p-2 text-xs text-indigo-300 border border-indigo-500/30 shadow-lg flex items-center gap-2 animate-pulse">
                  <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="italic truncate">{interimTranscript}</span>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                {roomState === 'AI_SPEAKING'
                  ? 'AI is speaking the question. You can begin answering when ready.'
                  : 'Answers are evaluated on technical depth, relevance, and clarity.'}
              </p>

              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || (!answer.trim() && !interimTranscript.trim())}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Candidate Video Cockpit & Session Stats */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-slate-800/80 bg-slate-900/30 p-6 flex flex-col gap-6 shrink-0">
          {/* Candidate Webcam Feed */}
          <div className="relative aspect-video bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex items-center justify-center">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="w-8 h-8 mb-2" />
                <span className="text-xs font-semibold">Camera Off</span>
              </div>
            )}

            {/* Video Overlay Info */}
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>Candidate Feed</span>
            </div>

            <button
              onClick={toggleCamera}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-slate-300 hover:text-white border border-slate-800 transition"
              title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Session Overview & Progress Checklist */}
          <div className="flex-1 bg-slate-900/60 rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Session Status
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Target Role</span>
                  <span className="font-bold text-white">{interview.target_role}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Question Progress</span>
                  <span className="font-bold text-indigo-400">
                    {currentQuestion.question_order} / {interview.total_questions}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Interview Mode</span>
                  <span className="font-bold text-white">{interview.interview_type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Microphone</span>
                  <span className={`font-bold ${!isMicMutedByUser && isListening ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {!isMicMutedByUser && isListening ? 'Active (Listening)' : 'Muted'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Tab Switch Violations</span>
                  <span className={`font-bold ${tabSwitchCount >= 2 ? 'text-rose-400' : tabSwitchCount === 1 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {tabSwitchCount} / 2 used
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Adaptive AI</span>
                  <span className="font-bold text-purple-400">Real-time dynamic</span>
                </div>
              </div>
            </div>

            {/* Assessment Rules */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-200/90 leading-relaxed space-y-1">
              <p className="font-bold text-indigo-300">Integrity Protocol:</p>
              <p>• Max 2 tab switch warnings allowed. On the 3rd switch, interview terminates.</p>
              <p>• Detailed scores remain hidden until the interview concludes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switch Warning Modal (Warning 1 and Warning 2) */}
      {showTabSwitchWarning && !isTerminatedDueToTabSwitch && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 rounded-3xl p-6 border border-amber-500/50 shadow-2xl space-y-4 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <EyeOff className="w-7 h-7 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-white">
              {tabSwitchCount === 1
                ? 'Warning 1 of 2: Tab Switch Detected'
                : 'FINAL WARNING: 2 of 2 Warnings Used!'}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {tabSwitchCount === 1
                ? 'You switched away from the active interview window. You have 1 warning excuse remaining. If you switch tabs 2 more times, your session will be automatically terminated.'
                : 'You have used all 2 warning excuses! If you leave or switch tabs one more time, your interview will be immediately terminated and auto-submitted.'}
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <span>Violations:</span>
              <span>{tabSwitchCount} / 2 warnings used ({2 - tabSwitchCount} remaining)</span>
            </div>

            <div className="pt-2">
              <button
                onClick={handleResumeFromTabSwitch}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                {tabSwitchCount === 1
                  ? 'I Understand — Return to Interview & Fullscreen'
                  : 'Acknowledge Final Warning & Resume Fullscreen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switch Auto-Terminated Modal (3rd Switch Violation) */}
      {isTerminatedDueToTabSwitch && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 rounded-3xl p-6 border border-rose-500/50 shadow-2xl space-y-4 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertOctagon className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="text-xl font-extrabold text-white">Interview Terminated</h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              You have exceeded the maximum allowed tab switches (3 violations detected).
              The interview has been automatically closed and submitted for evaluation.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 font-semibold">
              Auto-saving all completed answers and generating your final report...
            </div>

            <div className="pt-2 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <button
                type="button"
                onClick={() => {
                  const targetId = interviewRef.current?.id || interviewId;
                  if (targetId) navigate(`/interview/report/${targetId}`);
                }}
                className="mt-1 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95"
              >
                Go to Report Now &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inactivity Warning Modal */}
      {inactivityWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 rounded-3xl p-6 border border-amber-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white">Are You Still There?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No activity has been detected for over 90 seconds. To maintain realism, this session will auto-submit in:
            </p>
            <div className="text-4xl font-extrabold font-mono text-amber-400">
              {inactivityCountdown}s
            </div>
            <div className="pt-2">
              <button
                onClick={registerActivity}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30"
              >
                I'm Still Here — Continue Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">End Mock Interview Early?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to end this interview? All answers provided up to this point will be saved, and Gemini will generate a report based on completed questions.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700"
              >
                Continue Interview
              </button>
              <button
                onClick={() => handleAutoSubmit('Candidate manually ended interview early')}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                End & Save Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
