/**
 * FlowPass — DatePicker UI Component
 *
 * Custom animated calendar dropdown for selecting event dates.
 * Replaces the native date input with a styled, accessible
 * calendar grid matching the FlowPass dark-mode design system.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const popupRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day + 1); // +1 to workaround timezone shift formatting
    const formatted = selected.toISOString().split('T')[0];
    onChange(formatted);
    setIsOpen(false);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyBoxes = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="relative w-full" ref={popupRef}>
      {label && <label className="block text-sm font-bold mb-2 text-white">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-background border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-go transition-colors"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-dim" />
          <span className={value ? "text-white font-mono" : "text-dim/50"}>
            {value || "Select a date..."}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 top-full left-0 mt-2 p-4 bg-[#12121A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full sm:w-[320px]"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-dim hover:text-white" />
              </button>
              <div className="font-bold text-lg tracking-wide">
                {monthNames[month]} {year}
              </div>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-dim hover:text-white" />
              </button>
            </div>

            {/* Day Names Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-bold text-dim uppercase tracking-wider py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-1">
              {emptyBoxes.map(i => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              {days.map(day => {
                const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = value === dateString;
                const isToday = new Date().toISOString().split('T')[0] === dateString;

                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDate(day)}
                    className={`
                      w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all
                      ${isSelected ? 'bg-go text-background font-bold shadow-[0_0_15px_rgba(0,255,135,0.4)]' : 'hover:bg-white/10 text-white'}
                      ${isToday && !isSelected ? 'border border-go/50 text-go' : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
