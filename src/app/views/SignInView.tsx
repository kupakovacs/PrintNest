import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;

export function SignInView({ onGoogleSignIn, loading, error, onBack }: { onGoogleSignIn: () => void; loading: boolean; error: string | null; onBack: () => void }) {

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /><span>Back</span>
      </button>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">Print<span className="text-primary">Nest</span></span>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back
          </p>
        </div>
        <button onClick={onGoogleSignIn} disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? "Connecting to Google..." : "Continue with Google"}
        </button>
        {error && <p className="text-center text-xs text-red-600 mt-3">{error}</p>}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or</span></div>
        </div>
        <button onClick={onBack}
          className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          Continue as guest
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Checkout                                                */
/* ─────────────────────────────────────────────────────── */

