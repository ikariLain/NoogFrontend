import { useCallback, useEffect, useState } from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { LoadingIndicator } from "../Loading/LoadingIndicator";
import { useAudioRecording } from "../RecordingStream"; // Importera din ljudinspelningshook
import './ConvertSendAudio.css';


export const CustomCallRecordButton = () => {
  const call = useCall();
  const { useIsCallRecordingInProgress } = useCallStateHooks();
  const isCallRecordingInProgress = useIsCallRecordingInProgress();
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  // Använd din direkta ljudinspelningshook
  const {
    isRecording: isDirectAudioRecording,
    startRecording: startDirectAudioRecording,
    stopRecording: stopDirectAudioRecording,
    error: directAudioError
  } = useAudioRecording();

  useEffect(() => {
    if (!call) return;

    const eventHandlers = [
      call.on("call.recording_started", () => {
        setIsAwaitingResponse(false);
        setError(null);
      }),
      call.on("call.recording_stopped", () => {
        setIsAwaitingResponse(false);
        setError(null);
        fetchRecordingUrl();
      }),
      call.on("call.recording_failed", (e) => {
        setIsAwaitingResponse(false);
        setError("Recording failed. Please try again.");
        console.error("Recording failed:", e);
      }),
    ];

    return () => {
      eventHandlers.forEach((unsubscribe) => unsubscribe());
    };
  }, [call]);

  const fetchRecordingUrl = useCallback(async () => {
    if (!call) return;

    try {
      const maxAttempts = 8;
      let attempts = 0;

      const tryFetchRecording = async () => {
        try {
          const recordings = await call.queryRecordings();
          if (recordings.recordings.length > 0) {
            const latestRecording = recordings.recordings[0];
            console.log("Recording found:", latestRecording);
            setRecordingUrl(latestRecording.url);
            return true;
          }
        } catch (error) {
          console.error("Error fetching recording URL:", error);
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryFetchRecording, 2000);
        }
      };

      setTimeout(tryFetchRecording, 3000);
    } catch (error) {
      console.error("Error fetching recordings:", error);
    }
  }, [call]);

  // Video recording (Stream)
  const toggleVideoRecording = useCallback(async () => {
    if (!call) {
      setError("No active call found");
      return;
    }

    try {
      setIsAwaitingResponse(true);
      setError(null);

      if (isCallRecordingInProgress) {
        await call.stopRecording();
      } else {
        await call.startRecording();
        setRecordingUrl(null);
      }
    } catch (e) {
      console.error(`Failed to ${isCallRecordingInProgress ? 'stop' : 'start'} recording`, e);
      setError(`Failed to ${isCallRecordingInProgress ? 'stop' : 'start'} recording`);
      setIsAwaitingResponse(false);
    }
  }, [call, isCallRecordingInProgress]);

  // Direct audio recording
  const toggleDirectAudioRecording = useCallback(async () => {
    if (isDirectAudioRecording) {
      stopDirectAudioRecording();
    } else {
      try {
        await startDirectAudioRecording();
        setError(null);
      } catch (err) {
        setError("Failed to start audio recording");
      }
    }
  }, [isDirectAudioRecording, startDirectAudioRecording, stopDirectAudioRecording]);

  // Funktion för att spara video lokalt
  const saveVideoLocally = useCallback(async () => {
    if (!recordingUrl) return;

    try {
      const response = await fetch(recordingUrl);
      if (!response.ok) throw new Error('Failed to fetch recording');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `video-recording-${new Date().getTime()}.mp4`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("Video saved locally - Size:", (blob.size / (1024 * 1024)).toFixed(2), "MB");
    } catch (error) {
      console.error("Error saving video:", error);
      setError("Failed to save video");
    }
  }, [recordingUrl]);

  // Enkel ljudsparning från video (STOR fil)
  const saveAudioFromVideo = useCallback(async () => {
    if (!recordingUrl) return;

    try {
      const response = await fetch(recordingUrl);
      if (!response.ok) throw new Error('Failed to fetch recording');

      const videoBlob = await response.blob();

      // Denna sparar fortfarande videon som "ljudfil" - STOR!
      const url = window.URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audio-from-video-${new Date().getTime()}.m4a`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("Audio saved from video - Size:", (videoBlob.size / (1024 * 1024)).toFixed(2), "MB");
      console.log("⚠️ This file still contains video data!");
    } catch (error) {
      console.error("Error saving audio:", error);
      setError("Failed to save audio");
    }
  }, [recordingUrl]);

  // Funktion för att skicka via email
  const sendViaEmail = useCallback(() => {
    if (!recordingUrl) return;

    const subject = encodeURIComponent("Video Call Recording");
    const body = encodeURIComponent(`Here is the recording from our video call: ${recordingUrl}\n\nYou can download it from this link.`);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

    window.open(mailtoLink);
  }, [recordingUrl]);

  // Visa errors från direkt ljudinspelning
  useEffect(() => {
    if (directAudioError) {
      setError(directAudioError);
    }
  }, [directAudioError]);

  if (isAwaitingResponse) {
    return (
      <div className="recording-section">
        <LoadingIndicator />
        <div className="recording-status">
          {isCallRecordingInProgress ? 'Stopping video recording...' : 'Starting video recording...'}
        </div>
      </div>
    );
  }

  return (
    <div className="recording-section">
      {error && <div className="error-message">{error}</div>}

      <div className="recording-controls">
        {/* Video Recording (Stream) */}
        <div className="recording-option">
          <h4>Video Recording (with Stream)</h4>
          <button
            onClick={toggleVideoRecording}
            className={`record-button ${isCallRecordingInProgress ? 'recording' : ''}`}
          >
            {isCallRecordingInProgress ? 'Stop Video Recording' : 'Start Video Recording'}
          </button>
          <div className="recording-status">
            {isCallRecordingInProgress ? '🔴 Video recording...' : 'Video recording ready'}
          </div>
        </div>

        {/* Direct Audio Recording */}
        <div className="recording-option">
          <h4>Audio Only (Small Files)</h4>
          <button
            onClick={toggleDirectAudioRecording}
            className={`record-button audio-only ${isDirectAudioRecording ? 'recording' : ''}`}
          >
            {isDirectAudioRecording ? 'Stop Audio Recording' : 'Start Audio Recording'}
          </button>
          <div className="recording-status">
            {isDirectAudioRecording ? '🔴 Audio recording...' : 'Audio recording ready'}
          </div>
          <div className="size-info">
            <small>Audio files are 90% smaller than video files</small>
          </div>
        </div>
      </div>

      {/* Download buttons för video recording */}
      {recordingUrl && (
        <div className="download-options">
          <h4>Download Video Recording:</h4>
          <div className="download-buttons">
            <button
              onClick={saveVideoLocally}
              className="download-btn video-btn"
            >
              💾 Save as Video (Large)
            </button>
            <button
              onClick={saveAudioFromVideo}
              className="download-btn audio-btn"
            >
              🎵 Save as Audio (Still Large)
            </button>
            <button
              onClick={sendViaEmail}
              className="download-btn email-btn"
            >
              📧 Send via Email
            </button>
          </div>

          <div className="size-warning">
            <small>⚠️ Both options above contain video data and are large files</small>
          </div>

          <div className="recording-url">
            <small>
              <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                🔗 Open original recording URL
              </a>
            </small>
          </div>
        </div>
      )}
    </div>
  );
};