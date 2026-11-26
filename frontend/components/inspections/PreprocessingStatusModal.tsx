'use client'

import { Loader2 } from 'lucide-react'

export function PreprocessingStatusModal() {
  return (
    <div className="modal-layer" role="status" aria-live="polite">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-xl text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-900">Running live crack analysis</h3>
        <p className="text-sm text-slate-600 mt-2">
          The inspection image is being sent to the backend. Results will appear when analysis finishes.
        </p>
      </div>
    </div>
  )
}
