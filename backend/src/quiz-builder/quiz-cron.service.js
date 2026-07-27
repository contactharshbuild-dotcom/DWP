import { McqTest, McqAttempt } from '../models/index.js';
import { Op } from 'sequelize';

export class QuizCronService {
  static intervalId = null;

  /**
   * Start the periodic cron worker (runs every 60 seconds)
   */
  static startCronJob() {
    if (this.intervalId) return;

    console.log('[QuizCronService] Starting quiz background cron scheduler (60s interval)...');
    
    // Initial execution on server boot
    this.processScheduledQuizzes();

    // Set recurring timer
    this.intervalId = setInterval(() => {
      this.processScheduledQuizzes();
    }, 60000);
  }

  /**
   * Stop the cron worker (for graceful shutdown)
   */
  static stopCronJob() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[QuizCronService] Quiz background cron scheduler stopped.');
    }
  }

  /**
   * Main cron task processor
   */
  static async processScheduledQuizzes() {
    try {
      const now = new Date();

      // 1. Auto-Start Quizzes where NOW >= start_window and status is 'scheduled'
      const quizzesToStart = await McqTest.findAll({
        where: {
          activation_mode: 'auto',
          status: 'scheduled',
          start_window: { [Op.lte]: now }
        }
      });

      for (const quiz of quizzesToStart) {
        await quiz.update({ status: 'active' });
        console.log(`[QuizCronService] Auto-started Quiz ID ${quiz.id} ("${quiz.title}")`);
      }

      // 2. Auto-End Quizzes where NOW >= end_window and status is 'active' or 'scheduled'
      const quizzesToEnd = await McqTest.findAll({
        where: {
          status: { [Op.in]: ['scheduled', 'active'] },
          end_window: { [Op.not]: null, [Op.lte]: now }
        }
      });

      for (const quiz of quizzesToEnd) {
        await quiz.update({ status: 'completed' });
        console.log(`[QuizCronService] Auto-completed Quiz ID ${quiz.id} ("${quiz.title}")`);

        // Auto-submit any unsubmitted student attempts for this quiz
        const pendingAttempts = await McqAttempt.findAll({
          where: {
            test_id: quiz.id,
            status: 'started'
          }
        });

        for (const attempt of pendingAttempts) {
          await attempt.update({
            status: 'submitted',
            submit_type: 'auto',
            end_time: now
          });
          console.log(`[QuizCronService] Auto-submitted Attempt ID ${attempt.id} for User ${attempt.user_id}`);
        }
      }
    } catch (error) {
      console.error('[QuizCronService] Error processing scheduled quizzes:', error);
    }
  }
}
