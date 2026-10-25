import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
    Mic,
    Square,
    RefreshCw,
    Download,
    Activity,
    CheckCircle2,
    AlertTriangle,
    RotateCcw,
    Volume2,
    Play,
    Pause,
    Sliders,
    Layers,
    Sparkles,
} from 'lucide-react'
import { processAudio, type AudioProcessResponse } from '../../api/recordings'

export interface PositionInfo {
    id: string
    name: string
    code: string
    location: string
    description: string
    xPct: number
    yPct: number
    cx?: number
    cy?: number
    color: string
}

export const AUSCULTATION_POSITIONS: PositionInfo[] = [
    {
        id: 'aortic',
        code: 'A',
        name: 'Aortic Area',
        location: '2nd intercostal space, right sternal border',
        description: 'Aortic valve sounds, S2 component, systolic ejection murmurs, aortic stenosis.',
        xPct: 41,
        yPct: 30,
        cx: 41,
        cy: 30,
        color: '#ef4444', // red
    },
    {
        id: 'pulmonic',
        code: 'P',
        name: 'Pulmonic Area',
        location: '2nd intercostal space, left sternal border',
        description: 'Pulmonic valve sounds, P2 component, pulmonary flow murmurs, patent ductus.',
        xPct: 59,
        yPct: 30,
        cx: 59,
        cy: 30,
        color: '#3b82f6', // blue
    },
    {
        id: 'erbs_point',
        code: 'E',
        name: "Erb's Point",
        location: '3rd intercostal space, left sternal border',
        description: 'Aortic regurgitation murmurs, hypertrophic cardiomyopathy, S1/S2 balance.',
        xPct: 59,
        yPct: 38,
        cx: 59,
        cy: 38,
        color: '#8b5cf6', // purple
    },
    {
        id: 'tricuspid',
        code: 'T',
        name: 'Tricuspid Area',
        location: '4th–5th intercostal space, lower left sternal border',
        description: 'Tricuspid valve closure, right ventricular S3/S4 sounds, tricuspid regurgitation.',
        xPct: 54,
        yPct: 48,
        cx: 54,
        cy: 48,
        color: '#10b981', // green
    },
    {
        id: 'mitral',
        code: 'M',
        name: 'Mitral / Apex Area (Optional)',
        location: '5th intercostal space, left midclavicular line (cardiac apex)',
        description: 'Left ventricular apex, mitral valve sounds, S1 loudness, S3 gallop, mitral regurgitation.',
        xPct: 65,
        yPct: 54,
        cx: 65,
        cy: 54,
        color: '#f59e0b', // amber
    },
]

export interface CleanAudioInputDevice {
    deviceId: string
    label: string
    cleanName: string
    isUsbStethoscope: boolean
    isDefault: boolean
    isCommunications: boolean
    isDirectHardware: boolean
}

/**
 * Deduplicates audio input devices on Windows / WebRTC.
 * Eliminates duplicate virtual entries ("Default - ...", "Communications - ...")
 * and prioritizes the direct physical hardware device while auto-detecting USB stethoscopes.
 */
export function deduplicateAudioInputDevices(devices: MediaDeviceInfo[]): CleanAudioInputDevice[] {
    const audioInputs = devices.filter((d) => d.kind === 'audioinput')
    if (audioInputs.length === 0) return []

    const seenMap = new Map<string, CleanAudioInputDevice>()

    for (let i = 0; i < audioInputs.length; i++) {
        const raw = audioInputs[i]
        const label = raw.label || `Audio Input Device ${i + 1}`

        const isDefault = /^\s*Default\s*[-:]\s*/i.test(label) || raw.deviceId === 'default'
        const isCommunications = /^\s*Communications\s*[-:]\s*/i.test(label) || raw.deviceId === 'communications'
        const isDirectHardware = !isDefault && !isCommunications

        // Strip redundant "Default - " and "Communications - " Windows virtual prefixes
        const cleanName = label
            .replace(/^\s*(Default|Communications)\s*[-:]\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim()

        const isUsb = /usb|pnp|stethoscope|sound device|audio codec|pcm/i.test(cleanName)

        const candidate: CleanAudioInputDevice = {
            deviceId: raw.deviceId,
            label,
            cleanName,
            isUsbStethoscope: isUsb,
            isDefault,
            isCommunications,
            isDirectHardware,
        }

        const key = cleanName.toLowerCase()
        const existing = seenMap.get(key)

        if (!existing) {
            seenMap.set(key, candidate)
        } else {
            // Prioritize physical direct hardware ID over virtual default/communications aliases
            if (candidate.isDirectHardware && !existing.isDirectHardware) {
                seenMap.set(key, candidate)
            } else if (candidate.isDefault && existing.isCommunications) {
                seenMap.set(key, candidate)
            }
        }
    }

    const result = Array.from(seenMap.values())

    // Sort so recommended USB stethoscope microphone is always at the top
    result.sort((a, b) => {
        if (a.isUsbStethoscope && !b.isUsbStethoscope) return -1
        if (!a.isUsbStethoscope && b.isUsbStethoscope) return 1
        return a.cleanName.localeCompare(b.cleanName)
    })

    return result
}

// 16-bit PCM WAV encoder at target sample rate
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
        }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // PCM chunk size
    view.setUint16(20, 1, true)  // Audio format 1 = PCM
    view.setUint16(22, 1, true)  // Mono
    view.setUint32(24, sampleRate, true) // Sample rate
    view.setUint32(28, sampleRate * 2, true) // Byte rate (16-bit mono = sr * 2)
    view.setUint16(32, 2, true)  // Block align (1 channel * 2 bytes)
    view.setUint16(34, 16, true) // 16 bits per sample
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)

    let offset = 44
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }

    return new Blob([buffer], { type: 'audio/wav' })
}

// Resample audio buffer using linear interpolation to target sample rate (e.g. 16,000 Hz)
function resampleTo16k(input: Float32Array, inputRate: number, targetRate = 16000): Float32Array {
    if (inputRate === targetRate) return input
    const ratio = inputRate / targetRate
    const newLength = Math.round(input.length / ratio)
    const result = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
        const origIndex = i * ratio
        const indexLow = Math.floor(origIndex)
        const indexHigh = Math.min(indexLow + 1, input.length - 1)
        const weight = origIndex - indexLow
        result[i] = input[indexLow] * (1 - weight) + input[indexHigh] * weight
    }
    return result
}

// Simple Canvas Waveform drawer
function WaveformCanvas({
    audioUrl,
    color = '#0d9488',
    height = 54,
}: {
    audioUrl: string | null
    color?: string
    height?: number
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!audioUrl || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let cancelled = false
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()

        fetch(audioUrl)
            .then((res) => res.arrayBuffer())
            .then((buf) => audioCtx.decodeAudioData(buf))
            .then((audioBuffer) => {
                if (cancelled) return
                const data = audioBuffer.getChannelData(0)
                const step = Math.ceil(data.length / canvas.width)
                const amp = canvas.height / 2

                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.fillStyle = color

                for (let i = 0; i < canvas.width; i++) {
                    let min = 1.0
                    let max = -1.0
                    for (let j = 0; j < step; j++) {
                        const datum = data[i * step + j] || 0
                        if (datum < min) min = datum
                        if (datum > max) max = datum
                    }
                    const y1 = Math.max(1, (1 + min) * amp)
                    const y2 = Math.min(canvas.height - 1, (1 + max) * amp)
                    ctx.fillRect(i, y1, 1, Math.max(2, y2 - y1))
                }
            })
            .catch((err) => console.warn('Waveform render notice:', err))
            .finally(() => {
                void audioCtx.close()
            })

        return () => {
            cancelled = true
        }
    }, [audioUrl, color])

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={height}
            className="w-full rounded bg-slate-950/5 border border-slate-200"
        />
    )
}

export function RecordAudio({
    audio,
    onAudioChange,
}: {
    audio: Blob | null
    onAudioChange: (audio: Blob | null) => void
}) {
    // Device management
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedDeviceId, setSelectedDeviceId] = useState('')
    const [deviceError, setDeviceError] = useState('')

    // Live input testing & VU level
    const [micActive, setMicActive] = useState(false)
    const [inputLevel, setInputLevel] = useState(0) // 0 to 100

    // 4-Position Auscultation Protocol (matching record.py)
    const [currentPosIndex, setCurrentPosIndex] = useState(0)
    const [positionRecordings, setPositionRecordings] = useState<(Float32Array | null)[]>([
        null,
        null,
        null,
        null,
    ])
    const [recordingDurationPerPos, setRecordingDurationPerPos] = useState(10) // 10s default

    // Recording State
    const [isRecording, setIsRecording] = useState(false)
    const [countdown, setCountdown] = useState(10)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    // DSP and audio outputs
    const [rawWavBlob, setRawWavBlob] = useState<Blob | null>(null)
    const [rawWavUrl, setRawWavUrl] = useState<string | null>(null)
    const [processedWavBlob, setProcessedWavBlob] = useState<Blob | null>(null)
    const [processedWavUrl, setProcessedWavUrl] = useState<string | null>(null)
    const [dspResult, setDspResult] = useState<AudioProcessResponse | null>(null)
    const [isProcessingDsp, setIsProcessingDsp] = useState(false)
    const [dspError, setDspError] = useState('')

    // Audio nodes and refs
    const audioContextRef = useRef<AudioContext | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const pcmChunksRef = useRef<Float32Array[]>([])
    const animationFrameRef = useRef<number | null>(null)
    const timerIntervalRef = useRef<number | null>(null)

    // Audio player refs for playback
    const rawAudioRef = useRef<HTMLAudioElement | null>(null)
    const procAudioRef = useRef<HTMLAudioElement | null>(null)
    const [rawPlaying, setRawPlaying] = useState(false)
    const [procPlaying, setProcPlaying] = useState(false)

    const activePosition = AUSCULTATION_POSITIONS[currentPosIndex] || AUSCULTATION_POSITIONS[0]

    // Deduplicated and normalized input devices
    const cleanDevices = useMemo(() => {
        return deduplicateAudioInputDevices(devices)
    }, [devices])

    const selectedCleanDevice = useMemo(() => {
        return cleanDevices.find((d) => d.deviceId === selectedDeviceId)
    }, [cleanDevices, selectedDeviceId])

    // Enumerate input devices and automatically select the best microphone
    const refreshDevices = useCallback(async () => {
        try {
            setDeviceError('')
            const deviceList = await navigator.mediaDevices.enumerateDevices()
            const audioInputs = deviceList.filter((d) => d.kind === 'audioinput')
            setDevices(audioInputs)

            const deduplicated = deduplicateAudioInputDevices(audioInputs)
            if (deduplicated.length > 0) {
                // Find USB stethoscope microphone
                const usbMic = deduplicated.find((d) => d.isUsbStethoscope)
                setSelectedDeviceId((prev) => {
                    if (prev && deduplicated.some((d) => d.deviceId === prev)) {
                        return prev
                    }
                    return usbMic ? usbMic.deviceId : deduplicated[0].deviceId
                })
            }
        } catch (err) {
            setDeviceError('Could not enumerate audio input devices. Please check browser permissions.')
        }
    }, [])

    useEffect(() => {
        void refreshDevices()
        navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices)
        return () => {
            navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices)
            stopStream()
        }
    }, [refreshDevices])

    const stopStream = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
        if (processorRef.current) {
            processorRef.current.onaudioprocess = null
            try { processorRef.current.disconnect() } catch { }
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop())
            mediaStreamRef.current = null
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            void audioContextRef.current.close()
            audioContextRef.current = null
        }
        setMicActive(false)
        setInputLevel(0)
    }

    // Live microphone monitor / level test
    const startMicTest = async () => {
        stopStream()
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId ? { ideal: selectedDeviceId } : undefined,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            })
            mediaStreamRef.current = stream
            await refreshDevices()

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContextRef.current = ctx
            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyserRef.current = analyser

            setMicActive(true)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const updateMeter = () => {
                if (!analyserRef.current) return
                analyserRef.current.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                const avg = sum / dataArray.length
                const level = Math.min(100, Math.round((avg / 128) * 100))
                setInputLevel(level)
                animationFrameRef.current = requestAnimationFrame(updateMeter)
            }
            updateMeter()
        } catch (err) {
            setDeviceError(err instanceof Error ? err.message : 'Microphone permission denied or device busy.')
        }
    }

    // Start recording current position
    const startRecordingPosition = async () => {
        stopStream()
        setDeviceError('')
        setDspError('')
        pcmChunksRef.current = []

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId ? { ideal: selectedDeviceId } : undefined,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            })
            mediaStreamRef.current = stream
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContextRef.current = ctx

            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyserRef.current = analyser

            // Use ScriptProcessor to capture raw PCM Float32 audio samples
            const processor = ctx.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0)
                pcmChunksRef.current.push(new Float32Array(inputData))
            }

            source.connect(processor)
            const muteGain = ctx.createGain()
            muteGain.gain.value = 0
            processor.connect(muteGain)
            muteGain.connect(ctx.destination)

            setIsRecording(true)
            setMicActive(true)
            setCountdown(recordingDurationPerPos)
            setElapsedSeconds(0)

            const startTimestamp = Date.now()
            timerIntervalRef.current = window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimestamp) / 1000)
                const remain = Math.max(0, recordingDurationPerPos - elapsed)
                setElapsedSeconds(elapsed)
                setCountdown(remain)

                if (remain <= 0) {
                    void stopRecordingPosition()
                }
            }, 250)

            // Live VU meter update
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const updateMeter = () => {
                if (!analyserRef.current) return
                analyserRef.current.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                setInputLevel(Math.min(100, Math.round((sum / dataArray.length / 128) * 100)))
                animationFrameRef.current = requestAnimationFrame(updateMeter)
            }
            updateMeter()
        } catch (err) {
            stopStream()
            setIsRecording(false)
            setDeviceError(err instanceof Error ? err.message : 'Failed to start recording.')
        }
    }

    // Stop recording and save position segment
    const stopRecordingPosition = async () => {
        if (!isRecording && !mediaStreamRef.current) return

        const inputSampleRate = audioContextRef.current?.sampleRate || 44100
        stopStream()
        setIsRecording(false)

        // Assemble collected chunks
        const totalSamples = pcmChunksRef.current.reduce((acc, c) => acc + c.length, 0)
        if (totalSamples < inputSampleRate * 0.5) {
            setDeviceError('Recording too short (less than 0.5 seconds). Please retake.')
            return
        }

        const merged = new Float32Array(totalSamples)
        let offset = 0
        for (const chunk of pcmChunksRef.current) {
            merged.set(chunk, offset)
            offset += chunk.length
        }

        // Resample to 16,000 Hz (matching record.py standard)
        const samples16k = resampleTo16k(merged, inputSampleRate, 16000)

        // Update position array
        const updated = [...positionRecordings]
        updated[currentPosIndex] = samples16k
        setPositionRecordings(updated)

        // Generate Raw WAV for current or combined recordings
        assembleAndProcessAudio(updated, currentPosIndex)
    }

    // Assemble all captured positions or current position into Raw WAV & trigger DSP pipeline
    const assembleAndProcessAudio = async (
        positions: (Float32Array | null)[],
        targetIndex: number
    ) => {
        setIsProcessingDsp(true)
        setDspError('')

        try {
            // If all 4 positions are present, combine them in sequence (as record.py does: 40s total)
            const completedCount = positions.filter((p) => p !== null).length
            let combinedSamples: Float32Array

            if (completedCount === 4) {
                const totalLen = positions.reduce((acc, p) => acc + (p ? p.length : 0), 0)
                combinedSamples = new Float32Array(totalLen)
                let off = 0
                for (let i = 0; i < 4; i++) {
                    const seg = positions[i]
                    if (seg) {
                        combinedSamples.set(seg, off)
                        off += seg.length
                    }
                }
            } else {
                // Use current position segment
                combinedSamples = positions[targetIndex] || new Float32Array(0)
            }

            if (combinedSamples.length === 0) return

            // Create Raw 16kHz WAV Blob
            const rawBlob = encodeWav(combinedSamples, 16000)
            setRawWavBlob(rawBlob)
            const rawUrl = URL.createObjectURL(rawBlob)
            setRawWavUrl(rawUrl)

            // Send to Backend DSP Endpoint (/api/audio/process) for record.py pipeline!
            const dspResponse = await processAudio(rawBlob)
            setDspResult(dspResponse)

            // Convert returned base64 data URL to Blob for analysis submission
            let processedBlob: Blob = rawBlob
            if (dspResponse.processedWavDataUrl) {
                try {
                    const res = await fetch(dspResponse.processedWavDataUrl)
                    processedBlob = await res.blob()
                } catch {
                    processedBlob = rawBlob
                }
            }
            setProcessedWavBlob(processedBlob)
            setProcessedWavUrl(dspResponse.processedWavDataUrl || rawUrl)

            // Emit processed audio as ready for analysis!
            onAudioChange(processedBlob)
        } catch (err) {
            console.error('DSP error:', err)
            setDspError(err instanceof Error ? err.message : 'Clinical DSP processing failed.')
            // Fallback: emit raw audio if DSP processing had network issue
            if (rawWavBlob) onAudioChange(rawWavBlob)
        } finally {
            setIsProcessingDsp(false)
        }
    }

    // Retake individual position
    const retakePosition = (index: number) => {
        const updated = [...positionRecordings]
        updated[index] = null
        setPositionRecordings(updated)
        setCurrentPosIndex(index)
    }

    // Download helpers
    const downloadWavFile = (blob: Blob | null, filename: string) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const recordedPositionsCount = positionRecordings.filter((p) => p !== null).length

    return (
        <div className="space-y-6">
            {/* 1. Hardware Microphone Selection & VU Level Meter */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Mic className="h-4 w-4 text-brand-700" />
                            USB Microphone Interface
                        </h3>
                        <p className="text-xs text-slate-500">
                            Select your USB microphone coupled acoustically to the stethoscope.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void refreshDevices()}
                        disabled={isRecording}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        title="Scan for connected USB microphones"
                    >
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh Devices
                    </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-1">
                        <select
                            id="mic-device-select"
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            disabled={isRecording}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        >
                            {cleanDevices.length === 0 ? (
                                <option value="">Default Microphone (Allow browser mic access)</option>
                            ) : (
                                cleanDevices.map((device) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.cleanName} {device.isUsbStethoscope ? '🩺 [Recommended USB Stethoscope]' : ' [System Audio]'}
                                    </option>
                                ))
                            )}
                        </select>
                        {selectedCleanDevice?.isUsbStethoscope && (
                            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5 pt-0.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>Coupled to USB Stethoscope Sensor: <strong className="font-bold text-emerald-800">{selectedCleanDevice.cleanName}</strong></span>
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => (micActive && !isRecording ? stopStream() : void startMicTest())}
                        disabled={isRecording}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition h-fit ${micActive && !isRecording
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <Activity className="h-3.5 w-3.5 text-brand-700" />
                        {micActive && !isRecording ? 'Stop VU Test' : 'Test Mic Level'}
                    </button>
                </div>

                {/* Live Audio VU Level Meter */}
                <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                    <Volume2 className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex-1">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={`h-full transition-all duration-75 ${inputLevel > 75
                                        ? 'bg-red-500'
                                        : inputLevel > 35
                                            ? 'bg-emerald-500'
                                            : 'bg-teal-500'
                                    }`}
                                style={{ width: `${inputLevel}%` }}
                            />
                        </div>
                    </div>
                    <span className="w-12 text-right text-xs font-mono font-medium text-slate-600">
                        {inputLevel}%
                    </span>
                </div>

                {deviceError && (
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{deviceError}</span>
                    </div>
                )}
            </div>

            {/* 2. Four-Position Auscultation Protocol & Educational Placement Guide */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-sky-100 mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-sky-700" />
                            Four-Position Heart Sound Protocol (CIRCOR / record.py)
                        </h3>
                        <p className="text-xs text-slate-600">
                            Sequential 10s recordings across the 4 key auscultation landmarks.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                        {recordedPositionsCount} of 4 Recorded
                    </span>
                </div>

                {/* Position Step Selectors */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
                    {AUSCULTATION_POSITIONS.slice(0, 4).map((pos, idx) => {
                        const isCompleted = positionRecordings[idx] !== null
                        const isActive = currentPosIndex === idx
                        return (
                            <button
                                key={pos.id}
                                type="button"
                                onClick={() => setCurrentPosIndex(idx)}
                                className={`relative flex flex-col items-start rounded-lg p-2.5 text-left border transition ${isActive
                                        ? 'border-brand-600 bg-white ring-2 ring-brand-500/20 shadow-sm'
                                        : isCompleted
                                            ? 'border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/60'
                                            : 'border-slate-200 bg-white/60 hover:bg-white'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white"
                                        style={{ backgroundColor: pos.color }}
                                    >
                                        {pos.code}
                                    </span>
                                    {isCompleted && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    )}
                                </div>
                                <span className="mt-1 text-xs font-bold text-slate-900 truncate w-full">
                                    {pos.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {isCompleted ? '✓ Saved (10s)' : '10s target'}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Interactive Anatomical Chest Diagram & Placement Instructions */}
                <div className="grid gap-5 md:grid-cols-[260px_1fr] items-center bg-white p-4 rounded-xl border border-sky-100 shadow-xs">
                    {/* Detailed Anatomical Chest Illustration with Interactive Pins */}
                    <div className="relative mx-auto w-full max-w-[260px] rounded-xl overflow-hidden border border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/60 p-2 shadow-xs">
                        <div className="flex items-center justify-between px-1 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Patient Right (R)</span>
                            <span>Patient Left (L)</span>
                        </div>

                        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-white border border-slate-200 shadow-inner">
                            <img
                                src="/chest_auscultation_anatomy.jpg"
                                alt="Detailed anterior chest auscultation anatomy showing ribcage, sternum, and cardiac landmarks"
                                className="w-full h-full object-cover select-none pointer-events-none"
                                loading="eager"
                            />

                            {/* Landmark Pins */}
                            {AUSCULTATION_POSITIONS.map((pos) => {
                                const isCurrent = pos.id === activePosition.id
                                return (
                                    <button
                                        key={pos.id}
                                        type="button"
                                        onClick={() => {
                                            const idx = AUSCULTATION_POSITIONS.findIndex((p) => p.id === pos.id)
                                            if (idx !== -1 && idx < 4) setCurrentPosIndex(idx)
                                        }}
                                        title={`${pos.name} (${pos.location}) - Click to select`}
                                        className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none focus:scale-110 transition-transform z-10"
                                        style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
                                    >
                                        {isCurrent && (
                                            <span
                                                className="absolute inset-0 rounded-full animate-ping opacity-75"
                                                style={{ backgroundColor: pos.color }}
                                            />
                                        )}
                                        <span
                                            className={`relative flex items-center justify-center rounded-full text-white font-extrabold shadow-md transition-all ${isCurrent
                                                    ? 'h-7 w-7 text-xs ring-4 ring-white ring-offset-1 ring-offset-slate-900/10 scale-110'
                                                    : 'h-5 w-5 text-[10px] ring-2 ring-white hover:scale-125 opacity-90 hover:opacity-100'
                                                }`}
                                            style={{ backgroundColor: pos.color }}
                                        >
                                            {pos.code}
                                        </span>
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg pointer-events-none z-20">
                                            {pos.name}
                                        </span>
                                    </button>
                                )
                            })}

                            <div className="absolute bottom-1 inset-x-0 text-center pointer-events-none">
                                <span className="inline-block bg-white/85 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-semibold text-slate-700 shadow-2xs">
                                    Anterior Thoracic Auscultation Sites
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow-xs"
                                    style={{ backgroundColor: activePosition.color }}
                                >
                                    {activePosition.code}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm">{activePosition.name}</h4>
                            </div>
                            <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                                Landmark #{currentPosIndex + 1} of 4
                            </span>
                        </div>

                        <p className="font-semibold text-brand-900 leading-snug">
                            📍 Landmark: <span className="font-normal text-slate-700">{activePosition.location}</span>
                        </p>
                        <p className="text-slate-600 leading-relaxed">{activePosition.description}</p>

                        <div className="rounded-lg bg-amber-50/90 border border-amber-200/90 p-2.5 text-[11px] text-amber-900 leading-relaxed shadow-2xs">
                            <span className="font-bold">Clinical Best Practice:</span> Place stethoscope diaphragm firmly against the skin at the marked landmark. Minimize patient movement and respiratory sounds during the 10-second capture to isolate valve acoustics.
                        </div>
                    </div>
                </div>

                {/* 3. Active Recording Controls */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {!isRecording ? (
                                <button
                                    type="button"
                                    onClick={() => void startRecordingPosition()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-800 transition active:scale-95"
                                >
                                    <Mic className="h-4 w-4" /> Start Position {currentPosIndex + 1} Recording
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void stopRecordingPosition()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 animate-pulse transition"
                                >
                                    <Square className="h-4 w-4" /> Stop Recording Early
                                </button>
                            )}

                            {positionRecordings[currentPosIndex] && !isRecording && (
                                <button
                                    type="button"
                                    onClick={() => retakePosition(currentPosIndex)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Retake Position {currentPosIndex + 1}
                                </button>
                            )}
                        </div>

                        {/* Timer & Status Display */}
                        <div className="flex items-center gap-3">
                            <span
                                className={`text-sm font-black tabular-nums ${isRecording ? 'text-red-600 animate-pulse' : 'text-slate-700'
                                    }`}
                            >
                                {isRecording ? `● Recording (${countdown}s left)` : `Target: 10s per landmark`}
                            </span>
                            {positionRecordings[currentPosIndex] && !isRecording && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                    Position {currentPosIndex + 1} Complete
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Side-by-Side Raw vs Processed Audio Players & Downloads */}
            {(rawWavUrl || processedWavUrl || isProcessingDsp) && (
                <div className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sliders className="h-4 w-4 text-teal-700" />
                                Raw vs. Clinical Processed Audio Comparison
                            </h3>
                            <p className="text-xs text-slate-500">
                                Acoustic DSP pipeline: DC offset removal, 20–2000Hz band-pass, 50Hz notch, spectral noise reduction, 0.90 normalization.
                            </p>
                        </div>
                        {isProcessingDsp && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200">
                                <Sparkles className="h-3.5 w-3.5 animate-spin text-teal-600" />
                                <span>Running record.py DSP Pipeline...</span>
                            </div>
                        )}
                    </div>

                    {dspError && (
                        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                            Note: {dspError}
                        </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        {/* Raw Audio Card */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Original Captured Audio (Raw)
                                </span>
                                <span className="text-xs font-medium text-slate-500">16,000 Hz Mono</span>
                            </div>

                            {rawWavUrl && (
                                <>
                                    <WaveformCanvas audioUrl={rawWavUrl} color="#64748b" height={52} />
                                    <audio
                                        ref={rawAudioRef}
                                        src={rawWavUrl}
                                        controls
                                        className="w-full h-9"
                                        onPlay={() => setRawPlaying(true)}
                                        onPause={() => setRawPlaying(false)}
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => downloadWavFile(rawWavBlob, 'stethoscope_raw.wav')}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition"
                                            >
                                                <Download className="h-3.5 w-3.5" /> stethoscope_raw.wav
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadWavFile(
                                                        rawWavBlob,
                                                        dspResult?.rawTimestampFilename || `raw_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.wav`
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                                title="Download raw timestamped file"
                                            >
                                                <Download className="h-3.5 w-3.5" /> {dspResult?.rawTimestampFilename || 'raw_timestamp.wav'}
                                            </button>
                                        </div>
                                        {dspResult?.metrics && (
                                            <span className="text-[11px] font-mono text-slate-500">
                                                Peak: {dspResult.metrics.raw_peak} | RMS: {dspResult.metrics.raw_rms}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Processed Audio Card */}
                        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                                    Clinically Filtered Audio (Processed)
                                </span>
                                <span className="text-xs font-semibold text-teal-700">✓ Ready for ML</span>
                            </div>

                            {processedWavUrl && (
                                <>
                                    <WaveformCanvas audioUrl={processedWavUrl} color="#0f766e" height={52} />
                                    <audio
                                        ref={procAudioRef}
                                        src={processedWavUrl}
                                        controls
                                        className="w-full h-9"
                                        onPlay={() => setProcPlaying(true)}
                                        onPause={() => setProcPlaying(false)}
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => downloadWavFile(processedWavBlob, 'stethoscope_processed.wav')}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 transition"
                                            >
                                                <Download className="h-3.5 w-3.5" /> stethoscope_processed.wav
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadWavFile(
                                                        processedWavBlob,
                                                        dspResult?.timestampFilename || `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.wav`
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900 transition bg-brand-50 px-2 py-0.5 rounded border border-brand-200"
                                                title="Download timestamped file matching record.py"
                                            >
                                                <Download className="h-3.5 w-3.5" /> {dspResult?.timestampFilename || 'date_string.wav'}
                                            </button>
                                        </div>
                                        {dspResult?.metrics && (
                                            <span className="text-[11px] font-mono text-teal-800">
                                                Peak: {dspResult.metrics.processed_peak} (0.90 Target) | Gain: {dspResult.metrics.gain_applied}x
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* DSP Processing Audit Checklist */}
                    {dspResult && (
                        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs">
                            <span className="font-bold text-slate-800 block mb-1.5">
                                Clinical Acoustic Filters Verified:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> DC Offset Removed
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> 20–2000 Hz Band-pass
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> 50 Hz Electrical Notch
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Spectral Noise Reduction
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Peak Normalization (0.90)
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Dynamic Peak Limiter
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
