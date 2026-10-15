import type { TutorialFlow } from '@/contexts/tutorial-context';

export const extempPracticeTutorial: TutorialFlow = {
  id: 'extemp-practice',
  name: 'Extemporaneous Speaking Practice',
  steps: [
    {
      id: 'welcome',
      targetSelector: '[data-tutorial="topic-generator"]',
      title: 'Welcome to Extemp Practice!',
      description:
        "Let's walk through a complete extemp practice session. First, you'll generate three current event questions to choose from.",
      direction: 'bottom',
      highlightPulse: true,
    },
    {
      id: 'generate-topics',
      targetSelector: '[data-tutorial="generate-button"]',
      title: 'Generate Topics',
      description:
        'Click this button to generate three current event questions. The AI will create unique, relevant topics based on recent news.',
      direction: 'bottom',
      nextLabel: 'I generated topics',
      highlightPulse: true,
    },
    {
      id: 'select-topic',
      targetSelector: '[data-tutorial="topic-card"]',
      title: 'Select Your Topic',
      description:
        'Choose one of the three topics by clicking on it. This will start your 30-minute prep time immediately.',
      direction: 'bottom',
      nextLabel: 'I selected a topic',
      highlightPulse: true,
    },
    {
      id: 'prep-timer',
      targetSelector: '[data-tutorial="prep-timer"]',
      title: 'Prep Timer',
      description:
        'Your 30-minute prep timer is now running. Use this time to research and organize your speech. You can pause it anytime.',
      direction: 'left',
    },
    {
      id: 'notes-area',
      targetSelector: '[data-tutorial="notes"]',
      title: 'Take Notes',
      description:
        'Use this area to jot down your outline, key points, and evidence. Your notes are private and only visible to you.',
      direction: 'top',
    },
    {
      id: 'camera-toggle',
      targetSelector: '[data-tutorial="camera-toggle"]',
      title: 'Enable Your Camera',
      description:
        'Before recording, turn on your camera using this toggle. You can select which camera to use if you have multiple.',
      direction: 'left',
      nextLabel: 'Camera is ready',
      highlightPulse: true,
    },
    {
      id: 'record-button',
      targetSelector: '[data-tutorial="record-button"]',
      title: 'Record Your Speech',
      description:
        'When you\'re ready to deliver your speech, click "Record Speech". There will be a 5-second countdown before recording starts.',
      direction: 'left',
      highlightPulse: true,
    },
    {
      id: 'speech-timer',
      targetSelector: '[data-tutorial="speech-timer"]',
      title: 'Speech Timer',
      description:
        'This timer tracks your speech time. It will flash yellow at 1 minute remaining and red at 30 seconds. The timer can count up or down.',
      direction: 'left',
    },
    {
      id: 'save-recording',
      targetSelector: '[data-tutorial="save-button"]',
      title: 'Save Your Recording',
      description:
        'After recording, save your speech to review it later. You can share it with coaches or teammates for feedback.',
      direction: 'left',
      nextLabel: 'Got it!',
    },
    {
      id: 'ai-feedback',
      targetSelector: '[data-tutorial="get-feedback-button"]',
      title: 'Get AI Feedback',
      description:
        'Click "Get Feedback" on any saved recording to receive personalized coaching from the AI on your performance, argumentation, and delivery.',
      direction: 'right',
      nextLabel: 'Start Practicing!',
    },
  ],
};

export const impromptuPracticeTutorial: TutorialFlow = {
  id: 'impromptu-practice',
  name: 'Impromptu Speaking Practice',
  steps: [
    {
      id: 'welcome',
      targetSelector: '[data-tutorial="topic-generator"]',
      title: 'Welcome to Impromptu Practice!',
      description:
        'Impromptu speaking gives you 7 minutes total: prep time + speech time. Let\'s learn how it works.',
      direction: 'bottom',
    },
    {
      id: 'generate-topics',
      targetSelector: '[data-tutorial="generate-button"]',
      title: 'Generate Prompts',
      description:
        'Click to generate three impromptu prompts. These will be quotes, proverbs, or thought-provoking statements.',
      direction: 'bottom',
      nextLabel: 'I generated prompts',
      highlightPulse: true,
    },
    {
      id: 'select-topic',
      targetSelector: '[data-tutorial="topic-card"]',
      title: 'Choose Your Prompt',
      description:
        'Select one prompt. Your 2-minute default prep time starts immediately (you can adjust the time split).',
      direction: 'bottom',
      nextLabel: 'I selected a prompt',
      highlightPulse: true,
    },
    {
      id: 'time-adjustment',
      targetSelector: '[data-tutorial="time-adjust"]',
      title: 'Adjust Time Split',
      description:
        'Use these buttons to adjust how you split the 7:30 total time between prep and speech. More prep = less speech time!',
      direction: 'top',
    },
    {
      id: 'combined-timer',
      targetSelector: '[data-tutorial="combined-timer-toggle"]',
      title: 'Combined Timer Mode',
      description:
        'Enable this to use a single timer that counts up from 0:00 to 7:30. Stop it when done prepping - remaining time is for your speech.',
      direction: 'top',
    },
    {
      id: 'camera-setup',
      targetSelector: '[data-tutorial="camera-toggle"]',
      title: 'Camera Setup',
      description:
        'Turn on your camera before recording. Impromptu is often performed standing, so position your camera accordingly.',
      direction: 'left',
      nextLabel: 'Ready to record',
      highlightPulse: true,
    },
    {
      id: 'record',
      targetSelector: '[data-tutorial="record-button"]',
      title: 'Record Your Speech',
      description:
        'Click to start recording. Remember: be conversational, use examples, and structure your response clearly.',
      direction: 'left',
      highlightPulse: true,
    },
    {
      id: 'complete',
      targetSelector: '[data-tutorial="save-button"]',
      title: 'Review & Improve',
      description:
        'Save your recording and use "Get Feedback" to receive AI coaching on your organization, examples, and delivery!',
      direction: 'left',
      nextLabel: 'Start Practicing!',
    },
  ],
};

export const oratoryPracticeTutorial: TutorialFlow = {
  id: 'oratory-practice',
  name: 'Oratory Practice',
  steps: [
    {
      id: 'welcome',
      targetSelector: '[data-tutorial="saved-scripts"]',
      title: 'Welcome to Oratory Practice!',
      description:
        'Oratory is a persuasive speech you write and memorize. Let\'s walk through how to practice your oration.',
      direction: 'bottom',
    },
    {
      id: 'create-script',
      targetSelector: '[data-tutorial="new-script-button"]',
      title: 'Write Your Speech',
      description:
        'Click "New Script" to write your oratory. You can write the full text here and edit it anytime.',
      direction: 'bottom',
      nextLabel: 'I have a script',
      highlightPulse: true,
    },
    {
      id: 'practice-script',
      targetSelector: '[data-tutorial="practice-script-button"]',
      title: 'Practice Your Script',
      description:
        'Click "Practice" on any saved script to start a recording session. Your script will load into the teleprompter.',
      direction: 'right',
      nextLabel: 'I started practice',
      highlightPulse: true,
    },
    {
      id: 'teleprompter',
      targetSelector: '[data-tutorial="teleprompter"]',
      title: 'Teleprompter',
      description:
        'Your script appears here. You can auto-scroll it during practice, but remember: you should memorize your speech for competition!',
      direction: 'left',
    },
    {
      id: 'scroll-controls',
      targetSelector: '[data-tutorial="teleprompter-controls"]',
      title: 'Scroll Controls',
      description:
        'Adjust the scroll speed and start/stop auto-scrolling. Use this while practicing, but work towards delivering without it.',
      direction: 'left',
    },
    {
      id: 'recording',
      targetSelector: '[data-tutorial="record-button"]',
      title: 'Record Full Runs',
      description:
        'Record yourself delivering the entire speech. Watch it back to check your gestures, vocal variety, and pacing.',
      direction: 'left',
      highlightPulse: true,
    },
    {
      id: 'ai-feedback',
      targetSelector: '[data-tutorial="get-feedback-button"]',
      title: 'Get Detailed Feedback',
      description:
        'The AI can analyze your delivery, suggest improvements to your argumentation, and help polish your speech!',
      direction: 'right',
      nextLabel: 'Start Practicing!',
    },
  ],
};

export const informativePracticeTutorial: TutorialFlow = {
  id: 'informative-practice',
  name: 'Informative Speaking Practice',
  steps: [
    {
      id: 'welcome',
      targetSelector: '[data-tutorial="saved-scripts"]',
      title: 'Welcome to Informative Practice!',
      description:
        'Informative speaking educates your audience on a topic of significance. Let\'s practice your informative speech.',
      direction: 'bottom',
    },
    {
      id: 'write-speech',
      targetSelector: '[data-tutorial="new-script-button"]',
      title: 'Write Your Informative',
      description:
        'Create your speech here. Focus on clear structure, credible sources, and engaging delivery techniques.',
      direction: 'bottom',
      nextLabel: 'I have a speech',
      highlightPulse: true,
    },
    {
      id: 'practice',
      targetSelector: '[data-tutorial="practice-script-button"]',
      title: 'Practice Session',
      description:
        'Start a practice session to rehearse your speech with the timer and teleprompter.',
      direction: 'right',
      nextLabel: 'I started practice',
      highlightPulse: true,
    },
    {
      id: 'teleprompter',
      targetSelector: '[data-tutorial="teleprompter"]',
      title: 'Speech Text',
      description:
        'Your speech text loads here. Use it for reference, but work on memorization and eye contact with the camera.',
      direction: 'left',
    },
    {
      id: 'timer',
      targetSelector: '[data-tutorial="speech-timer"]',
      title: '10-Minute Timer',
      description:
        'Informative speeches are 10 minutes maximum. Watch this timer to practice staying within the time limit.',
      direction: 'left',
    },
    {
      id: 'record',
      targetSelector: '[data-tutorial="record-button"]',
      title: 'Record & Review',
      description:
        'Record your full speech to check pacing, vocal variety, and visual aid usage (if applicable).',
      direction: 'left',
      highlightPulse: true,
    },
    {
      id: 'feedback',
      targetSelector: '[data-tutorial="get-feedback-button"]',
      title: 'AI Coaching',
      description:
        'Get feedback on your clarity, organization, source citation, and delivery to make your speech even more engaging!',
      direction: 'right',
      nextLabel: 'Start Practicing!',
    },
  ],
};

// Export all tutorial flows
export const tutorialFlows = {
  extemp: extempPracticeTutorial,
  impromptu: impromptuPracticeTutorial,
  oratory: oratoryPracticeTutorial,
  informative: informativePracticeTutorial,
};
