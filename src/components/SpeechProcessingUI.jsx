import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  Square,
  Volume2,
  Send,
  Loader2,
  Waves,
  Heart,
  User,
  Calendar,
  Stethoscope,
  MessageSquare,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  Brain,
  RefreshCw,
  Edit3,
  CheckCircle,
  X,
  LogOut,
} from "lucide-react";
import { io } from "socket.io-client"; // Note: socket.io-client not available in this environment

const SpeechProcessingUI = ({ currentUser, onLogout }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [verificationStep, setVerificationStep] = useState("review"); // review, confirmed, processing

  const [wsStatus, setWsStatus] = useState("disconnected");
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showGuide, setShowGuide] = useState(true);

  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);

  const sampleQuestions = [
    {
      icon: User,
      category: "Profile Creation",
      color: "from-blue-500 to-cyan-500",
      example:
        "Create a profile for Bella who is a Shih Tzu and is 3 years old",
      description: "Set up your pet's profile with details",
    },
    {
      icon: Calendar,
      category: "Care Routine",
      color: "from-green-500 to-emerald-500",
      example: "Remind me to brush Bella's teeth around 2 PM",
      description: "Schedule care routines and reminders",
    },
    {
      icon: Stethoscope,
      category: "Health Concerns",
      color: "from-red-500 to-pink-500",
      example: "Bella is vomiting all day long, what should I do?",
      description: "Get health advice and guidance",
    },
  ];

  const initializeWebSocket = () => {
    // Note: In a real implementation, replace this with actual socket.io initialization
    // For demo purposes, we'll simulate connection

    setWsStatus("connecting");

    // Simulate connection (replace with actual socket.io code)
    // setTimeout(() => {
    //   setWsStatus("connected");
    // }, 1000);

    // In your actual implementation, use:
    wsRef.current = io("https://web-production-2282d.up.railway.app");

    wsRef.current.on("connect", () => {
      setWsStatus("connected");
    });

    wsRef.current.on("transcription", (data) => {
      setLiveTranscription(data.text);
    });

    wsRef.current.on("ai_response", (data) => {
      setIsProcessing(false);
      const response = data.text;
      setAiResponse(response);
      if (liveTranscription && response) {
        setConversationHistory((prev) => [
          ...prev,
          {
            id: Date.now(),
            timestamp: new Date(),
            userMessage: liveTranscription,
            aiResponse: response,
            type: detectMessageType(liveTranscription),
          },
        ]);
      }
    });

    const detectMessageType = (message) => {
      const text = message.toLowerCase();
      if (
        text.includes("profile") ||
        text.includes("create") ||
        text.includes("add")
      )
        return "profile";
      if (
        text.includes("remind") ||
        text.includes("schedule") ||
        text.includes("routine")
      )
        return "routine";
      if (
        text.includes("health") ||
        text.includes("sick") ||
        text.includes("vomit") ||
        text.includes("problem")
      )
        return "health";
      return "general";
    };
  };

  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const startRecording = async () => {
    try {
      setError("");
      setTranscription("");
      setAiResponse("");
      setLiveTranscription("");
      setShowGuide(false);

      if (wsStatus !== "connected") {
        setError("Not connected to server. Please wait...");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const pcmData = convertFloat32ToInt16(input);
        wsRef.current.emit("audio_data", pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      wsRef.current.emit("start_audio_stream", {
        sampleRate: 16000,
        encoding: "pcm_s16le",
      });

      setIsRecording(true);
      setIsStreaming(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 3000);
    } catch (err) {
      setError("Failed to access microphone.", err);
    }
  };

  const handleConfirmTranscription = () => {
    setIsProcessing(true);
    wsRef.current.emit("stop_audio_stream", {
      text: liveTranscription,
      id: currentUser.id,
    });
  };

  const convertFloat32ToInt16 = (buffer) => {
    const l = buffer.length;
    const result = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // if (wsRef.current) {
    //   wsRef.current.emit("stop_audio_stream", {
    //     text: liveTranscription,
    //     id: currentUser.id,
    //   });
    // }

    setIsRecording(false);
    setIsStreaming(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setError("");
      setTranscription("");
      setAiResponse("");
      setShowGuide(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSaveEdit = () => {
    setLiveTranscription(liveTranscription);
    setIsEditing(false);
  };

  const processAudio = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setError("");

    try {
      setProcessingStep("Uploading audio...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProcessingStep("Transcribing speech...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setProcessingStep("");
    } catch (err) {
      setError("Processing failed. Please try again.", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setTranscription("");
    setAiResponse("");
    setLiveTranscription("");
    setError("");
    setRecordingTime(0);
    setIsPlaying(false);
    setShowGuide(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleRetryTranscription = () => {
    // Simulate retrying transcription
    setVerificationStep("processing");
    setTimeout(() => {
      setVerificationStep("review");
    }, 2000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  const getMessageTypeIcon = (type) => {
    switch (type) {
      case "profile":
        return User;
      case "routine":
        return Calendar;
      case "health":
        return Stethoscope;
      default:
        return MessageSquare;
    }
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case "profile":
        return "text-blue-400";
      case "routine":
        return "text-green-400";
      case "health":
        return "text-red-400";
      default:
        return "text-purple-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                PetCare AI Assistant
              </h1>
              <p className="text-gray-300 text-sm">
                Your intelligent pet care companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-green-400 animate-pulse"
                    : wsStatus === "connecting"
                    ? "bg-yellow-400 animate-pulse"
                    : "bg-red-400"
                }`}
              />
              <span className="text-sm text-gray-300 capitalize">
                Status: {wsStatus}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              Hello, {currentUser.email}
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-gray-300"
            >
              <LogOut />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Guide */}
        {showGuide && (
          <div className="mb-8 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-purple-100">
                  Welcome to PetCare AI
                </h2>
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-purple-200 text-lg max-w-2xl mx-auto">
                Simply speak into your microphone and I'll help you with all
                your pet care needs. Press the microphone button, say your
                message, then stop to get my response!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sampleQuestions.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
                  >
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center mb-4`}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {item.category}
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      {item.description}
                    </p>
                    <div className="bg-black/30 rounded-xl p-3">
                      <p className="text-gray-200 text-sm italic">
                        "{item.example}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recording Section */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Waves className="w-5 h-5 text-blue-400" />
                Voice Input
              </h2>

              <div className="flex flex-col items-center space-y-6">
                {/* Main Recording Button */}
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
                      isRecording
                        ? "bg-gradient-to-r from-red-500 to-pink-500 animate-pulse shadow-2xl shadow-red-500/50"
                        : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-2xl shadow-blue-500/30"
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-8 h-8 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-white" />
                    )}
                  </button>

                  <div className="text-center">
                    {isRecording ? (
                      <div className="space-y-2">
                        <p className="text-white font-semibold text-lg">
                          {isStreaming ? "🎙️ Listening..." : "Recording..."}
                        </p>
                        <p className="text-red-400 font-mono text-xl font-bold">
                          {formatTime(recordingTime)}
                        </p>
                        {isStreaming && (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            <p className="text-red-400 text-sm font-medium">
                              LIVE
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-white font-semibold">
                          Ready to Listen
                        </p>
                        <p className="text-gray-300 text-sm">
                          Click to start speaking
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instruction */}
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 w-full">
                  <div className="flex items-center gap-4">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-300 font-medium mb-1">
                        How to use:
                      </p>
                      <p className="text-blue-200 text-sm">
                        1. Click the microphone button
                        <br />
                        2. Speak your question or request
                        <br />
                        3. Click stop when finished
                        <br />
                        4. Wait for AI response
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="w-full">
                  <label className="block text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-400 rounded-xl p-6 hover:border-purple-400 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-300">Or upload an audio file</p>
                    </div>
                  </label>
                </div>

                {/* Audio Player */}
                {audioUrl && (
                  <div className="w-full bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlayback}
                        className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm text-gray-300">
                          {audioFile?.name || "Recording.webm"}
                        </p>
                      </div>
                      <Volume2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Process Button - Only for file uploads */}
                {audioFile && !isStreaming && (
                  <button
                    onClick={processAudio}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl py-3 px-6 font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Process Audio File
                      </>
                    )}
                  </button>
                )}

                {/* Clear Button */}
                {(audioFile ||
                  transcription ||
                  aiResponse ||
                  conversationHistory.length > 0) && (
                  <button
                    onClick={clearAll}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Live Transcription */}
            {liveTranscription && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-blue-300 font-medium">You said:</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <button
                        onClick={handleRetryTranscription}
                        className="flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                      <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    </>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={liveTranscription}
                      onChange={(e) => setLiveTranscription(e.target.value)}
                      className="w-full bg-black/40 border border-gray-600 rounded-lg p-4 text-white resize-none focus:border-blue-500 focus:outline-none min-h-24"
                      placeholder="Edit the transcription..."
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-blue-100 bg-black/20 rounded-lg p-3">
                    {liveTranscription}
                  </p>
                )}
              </div>
            )}
            {verificationStep === "review" && liveTranscription != "" && (
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <button
                  onClick={handleConfirmTranscription}
                  disabled={!liveTranscription.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl py-3 px-6 font-semibold transition-all duration-300"
                >
                  <Send className="w-4 h-4" />
                  Confirm & Send to AI
                </button>
              </div>
            )}
            {/* Processing Status */}
            {processingStep && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span className="text-yellow-300">{processingStep}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}
            {isProcessing && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-300 font-medium">
                    AI Response:
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center space-y-4">
                  {/* Animated AI Brain Icon */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center animate-pulse">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    {/* Thinking particles */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-bounce" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-300" />
                    <div className="absolute top-2 -left-2 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-500" />
                  </div>
                  AI is thinking, please wait...
                </div>
              </div>
            )}
            {/* Current AI Response */}
            {aiResponse && !isProcessing && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-300 font-medium">
                    AI Response:
                  </span>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-gray-100 leading-relaxed">{aiResponse}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mt-12">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <div className="bg-black/20 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Conversation History
                  </h2>
                  <div className="bg-purple-500/20 px-3 py-1 rounded-full">
                    <span className="text-purple-300 text-sm font-medium">
                      {conversationHistory.length} conversations
                    </span>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {conversationHistory
                  .slice()
                  .reverse()
                  .map((conversation) => {
                    const TypeIcon = getMessageTypeIcon(conversation.type);
                    return (
                      <div
                        key={conversation.id}
                        className="p-6 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                              <TypeIcon
                                className={`w-4 h-4 ${getMessageTypeColor(
                                  conversation.type
                                )}`}
                              />
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-400 text-sm">
                                  {formatTimestamp(conversation.timestamp)}
                                </span>
                              </div>
                            </div>

                            {/* User Message */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-300 text-sm font-medium">
                                  You
                                </span>
                              </div>
                              <p className="text-gray-200 text-sm">
                                {conversation.userMessage}
                              </p>
                            </div>

                            {/* AI Response */}
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-purple-300 text-sm font-medium">
                                  PetCare AI
                                </span>
                              </div>
                              <p className="text-gray-200 text-sm leading-relaxed">
                                {conversation.aiResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechProcessingUI;
