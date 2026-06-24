/**
 * Custom hook for managing announcement form state and logic
 * Handles form data, validation, image preview, and submission
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

/**
 * Hook for managing announcement form operations
 * @param {Object} announcement - Announcement data for editing (null for new announcement)
 * @param {boolean} open - Dialog open state
 * @param {Function} onSubmit - Form submission handler
 * @returns {Object} Form management state and functions
 */
export const useAnnouncementForm = (announcement, open, onSubmit) => {
  // Form state
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [submissionError, setSubmissionError] = useState(null);

  // Form hook
  const form = useForm({
    defaultValues: {
      title: '',
      announcement: '',
      status: 'enabled',
    },
  });

  const { 
    register, 
    handleSubmit, 
    reset, 
    control, 
    setValue, 
    watch, 
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = form;

  // Watch status for conditional logic
  const status = watch('status');

  /**
   * Resets form to initial state
   */
  const resetForm = useCallback(() => {
    reset({
      title: '',
      announcement: '',
      status: 'enabled',
    });
    setActiveTab('details');
    setSubmissionError(null);
    clearErrors();
  }, [reset, clearErrors]);

  /**
   * Populates form with announcement data for editing
   */
  const populateForm = useCallback((announcementData) => {
    setValue('title', announcementData.title || '');
    setValue('announcement', announcementData.announcement || '');
    setValue('status', announcementData.status || 'enabled');
    setSubmissionError(null);
  }, [setValue]);

  /**
   * Handles image file selection and preview
   */
  // const handleImageChange = useCallback((event) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   // Validate file type
  //   if (!file.type.startsWith('image/')) {
  //     setSubmissionError('Please select a valid image file.');
  //     return;
  //   }

  //   // Validate file size (max 5MB)
  //   if (file.size > 5 * 1024 * 1024) {
  //     setSubmissionError('Image file size must be less than 5MB.');
  //     return;
  //   }

  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     setImagePreview(e.target.result);
  //     setSubmissionError(null);
  //   };
  //   reader.onerror = () => {
  //     setSubmissionError('Failed to read image file.');
  //   };
  //   reader.readAsDataURL(file);
  // }, []);

  /**
   * Validates form data before submission
   */
  // const validateFormData = useCallback((data) => {
  //   // Clear previous errors
  //   clearErrors();
  //   setSubmissionError(null);

  //   // Validate required fields
  //   if (!data.title?.trim()) {
  //     setError('title', { type: 'manual', message: 'Title is required' });
  //     setActiveTab('details');
  //     return false;
  //   }

  //   if (!data.name?.trim()) {
  //     setError('announcement', { type: 'manual', message: 'Announcement is required' });
  //     setActiveTab('details');
  //     return false;
  //   }

  //   return true;
  // }, [setError, clearErrors, setActiveTab]);

  /**
   * Handles form submission with validation
   */
  const handleFormSubmit = useCallback(async (data) => {
    try {
      setSubmissionError(null);

      // Validate form data
      // if (!validateFormData(data)) {
      //   return;
      // }

      // Process form data
      const processedData = {
        ...data,
      };

      // Submit form
      const result = await onSubmit(
        processedData
      );

      // Reset form on successful submission
      if (result !== false) {
        resetForm();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError(error.message || 'Failed to save announcement. Please try again.');
    }
  }, [onSubmit, resetForm]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (announcement) {
        populateForm(announcement);
      } else {
        resetForm();
      }
    }
  }, [open, announcement, populateForm, resetForm]);

  return {
    // Form state
    form,
    register,
    handleSubmit: handleSubmit(handleFormSubmit),
    control,
    errors,
    isSubmitting,
    status,

    // Tab state
    activeTab,
    setActiveTab,

    // Error state
    submissionError,
    setSubmissionError,

    // Actions
    resetForm,
  };
};
