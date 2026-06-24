'use client';

import { motion, AnimatePresence } from 'framer-motion';
import HIDListener from '@/lib/HIDListeners';
import Clock from '@/components/Clock';
import EmployeeCard from '@/components/layout/home/EmployeeCard';
import EmployeePhoto from '@/components/layout/home/EmployeePhoto';
import ErrorDisplay from '@/components/layout/home/ErrorDisplay';
import useAttendance from '@/hooks/useAttendance';
import { useState, useEffect } from 'react';
import useF2Shortcut  from '@/hooks/useF2Shortcut';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { ANIMATIONS } from '@/constants';
import Image from 'next/image';

export default function Home() {
  const {
    employeeInfo,
    attendanceLog,
    employeeStatus,
    error,
    showInstructions,
    handleTagRead,
    clearEmployeeInfo,
    loading, // <-- Destructure loading
    submitManualDate,
    manualDateOverride,
  } = useAttendance();

  const [isManualDateOpen, setIsManualDateOpen] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('Welcome! Announcements will appear here.');
  const { ToastContainer, success, error: toastError } = useToast();

  // Fetch announcement message from database
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch('/api/admin/announcements?limit=1&status=enabled');
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const announcement = data.data[0];
            // Combine title and announcement text for display
            const fullMessage = `${announcement.announcement}`;
            setAnnouncementMessage(fullMessage);
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcement:', err);
        // Keep default announcement if fetch fails
      }
    };

    fetchAnnouncement();
  }, []);

  // Format helper for the override and display
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const iso = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
      return new Date(iso).toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return dateString;
    }
  };

  // Function to activate unclaimed meals
  // const activateUnclaimedMeals = async () => {
  //   try {
  //     const response = await fetch('/api/attendance/activate-unclaimed', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //     });
  //     if (response.ok) {
  //       success('Unclaimed Meals has been activated');
  //     } else {
  //       toastError('Failed to activate unclaimed meals');
  //     }
  //   } catch (err) {
  //     toastError('Failed to activate unclaimed meals');
  //   }
  // };

  // useF2Shortcut(() => activateUnclaimedMeals());

  // useF2Shortcut(() => setIsManualDateOpen(true));

  return (
    <div className="min-h-screen relative text-white overflow-hidden bg-slate-950">
      <div className="relative min-h-screen">
        {/* Clock component at the top */}
        <motion.div
          className="pt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Clock overrideDate={manualDateOverride} />
        </motion.div>

        <div className="container my-5 mx-auto px-8 pb-20">
        {/* Instructions or welcome message */}
        <AnimatePresence>
          {showInstructions && !error && (
            <motion.div 
              className="text-center my-10"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              variants={ANIMATIONS.fadeIn}
            >
              <motion.h2 
                className="text-5xl font-bold text-cyan-300"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Please Tap Your RFID Card In Claiming Your Free Meal.
              </motion.h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employee data display */}
        <AnimatePresence>
          
          {employeeInfo && (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: 20 }}
              variants={ANIMATIONS.fadeIn}
              onAnimationComplete={() => {
                setTimeout(() => {
                  window.location.reload();
                }, 9000); // delay after animation
              }}
            >
              {/* Left side - Employee Info */}
              <EmployeeCard 
                employeeInfo={employeeInfo} 
                attendanceLog={attendanceLog}
                employeeStatus={employeeStatus} 
              />
              
              {/* Right side - Photo and status */}
              <EmployeePhoto 
                employeeInfo={employeeInfo}
                employeeStatus={employeeStatus} 
              />
            </motion.div>
            
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && <ErrorDisplay error={error} />}
        </AnimatePresence>

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center items-center mt-10">
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-cyan-500"></div>
            <span className="ml-6 text-3xl text-cyan-500 font-bold">Processing...</span>
          </div>
        )}
      </div>
      </div>

      <div className="fixed bottom-0 left-0 z-30 w-full">
        <motion.div
          className="w-full overflow-hidden border-y border-cyan-400/40 bg-cyan-950/90 py-3 shadow-lg shadow-cyan-950/30 backdrop-blur-md"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          role="status"
          aria-label={announcementMessage}
        >
          <div className="flex w-max animate-announcement whitespace-nowrap text-2xl font-bold uppercase tracking-normal text-yellow-200">
            <span className="px-10">{announcementMessage}</span>
            <span className="px-10" aria-hidden="true">{announcementMessage}</span>
            <span className="px-10" aria-hidden="true">{announcementMessage}</span>
          </div>
        </motion.div>

        {/* Company branding footer */}
        <div className="w-full bg-black/50 backdrop-blur-md">
          <div className="container mx-auto relative flex justify-between items-center px-8">
            {/* Title on the left */}
            <div className="text-2xl font-bold">Attendance-Based Meal System</div>
            
            {/* Spinner absolutely centered */}
            {loading && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-cyan-500"></div>
              </div>
            )}

            {/* Logo on the right */}
            <div>
              <Image
                src="/ew-logo-full.png" 
                alt="EWBPO Logo" 
                width={300}
                height={53}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toast container */}
      <ToastContainer />

      {/* HID Listener */}
      <HIDListener onTagRead={handleTagRead} />
    </div>
  );
}
