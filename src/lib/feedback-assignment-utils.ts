import type { Submission, User } from './types';

/**
 * Assigns videos to students for feedback with balanced distribution
 *
 * Algorithm:
 * 1. Filter submissions by class periods and remove student's own submission
 * 2. If not enough unique videos, return error
 * 3. Distribute videos to ensure each video gets roughly equal feedback
 * 4. Videos can be repeated across students to ensure everyone gets the same count
 *
 * @param studentId - ID of the student receiving assignments
 * @param sourceSubmissions - All submissions from the source assignment
 * @param feedbackCount - How many videos each student should critique
 * @param sourceClassPeriods - Which class periods to include (empty = all)
 * @param existingAssignments - Map of submissionId -> count of how many times already assigned
 * @returns Array of submission IDs assigned to this student, or error
 */
export function assignVideosToStudent(
  studentId: string,
  sourceSubmissions: Submission[],
  feedbackCount: number,
  sourceClassPeriods: string[],
  existingAssignments: Map<string, number> = new Map()
): { success: true; assignedIds: string[] } | { success: false; error: string } {
  // Step 1: Filter submissions
  let availableSubmissions = sourceSubmissions.filter(submission => {
    // Don't assign student's own submission
    if (submission.studentId === studentId) {
      return false;
    }

    // Filter by class periods if specified
    if (sourceClassPeriods.length > 0) {
      if (!submission.classPeriod || !sourceClassPeriods.includes(submission.classPeriod)) {
        return false;
      }
    }

    return true;
  });

  // Step 2: Check if enough unique videos exist
  if (availableSubmissions.length === 0) {
    return {
      success: false,
      error: 'No submissions available for feedback. Students cannot review their own work.'
    };
  }

  if (availableSubmissions.length < feedbackCount) {
    return {
      success: false,
      error: `Not enough submissions available. Found ${availableSubmissions.length} but need ${feedbackCount}. Please reduce the number of required critiques or wait for more submissions.`
    };
  }

  // Step 3: Sort submissions by current assignment count (least assigned first)
  const submissionsWithCounts = availableSubmissions.map(sub => ({
    submission: sub,
    assignmentCount: existingAssignments.get(sub.id) || 0
  }));

  submissionsWithCounts.sort((a, b) => {
    // First sort by assignment count (ascending)
    if (a.assignmentCount !== b.assignmentCount) {
      return a.assignmentCount - b.assignmentCount;
    }
    // Then by submission date (earliest first) for determinism
    return new Date(a.submission.submittedAt).getTime() - new Date(b.submission.submittedAt).getTime();
  });

  // Step 4: Assign videos using round-robin to balance distribution
  const assignedIds: string[] = [];

  for (let i = 0; i < feedbackCount; i++) {
    // Use modulo to cycle through available submissions if we need to repeat
    const selectedSubmission = submissionsWithCounts[i % submissionsWithCounts.length];
    assignedIds.push(selectedSubmission.submission.id);

    // Update the count for this submission for future assignments
    selectedSubmission.assignmentCount++;
  }

  return {
    success: true,
    assignedIds
  };
}

/**
 * Builds a map of how many times each submission has been assigned
 * across all existing feedback assignment submissions
 */
export function buildAssignmentCountMap(
  feedbackSubmissions: Submission[]
): Map<string, number> {
  const countMap = new Map<string, number>();

  feedbackSubmissions.forEach(feedbackSub => {
    if (feedbackSub.assignedSubmissionIds) {
      feedbackSub.assignedSubmissionIds.forEach(videoId => {
        countMap.set(videoId, (countMap.get(videoId) || 0) + 1);
      });
    }
  });

  return countMap;
}

/**
 * Counts the number of words in a string
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Calculates auto-grade for a feedback assignment submission
 */
export function calculateAutoGrade(
  videoFeedback: Array<{ isComplete: boolean }>,
  pointsPerCritique: number
): number {
  const completedCount = videoFeedback.filter(f => f.isComplete).length;
  return completedCount * pointsPerCritique;
}
