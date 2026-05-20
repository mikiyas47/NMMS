export class InvitationBehaviorService {
  /**
   * Aggregates call + text outcomes, calculates engagement level, updates Interest Score
   */
  static analyze(outcome, type, extraData = {}, currentScore = 0) {
    let baseScore = 5; // Invitation Sent
    let behaviorScore = 0;
    let engagementModifier = 0;

    // Base Score Modifiers
    if (extraData.scriptUsed && extraData.scriptUsed.includes('{name}')) {
      baseScore += 2;
    }
    if (extraData.new_phone) {
      baseScore += 3;
    }

    const notes = (extraData.notes || '').toLowerCase();

    if (type === 'call') {
      switch (outcome) {
        case 'success': behaviorScore = 25; break;
        case 'call_later': behaviorScore = 8; break;
        case 'no_answer': behaviorScore = 0; break;
        case 'wrong_number': behaviorScore = -10; break;
        case 'not_interested': behaviorScore = -25; break;
      }

      // Engagement Modifiers inferred from notes
      if (notes.includes('positive')) engagementModifier += 5;
      if (notes.includes('question')) engagementModifier += 10;
      if (notes.includes('long') || notes.includes('detailed')) engagementModifier += 5;
      if (notes.includes('hang up') || notes.includes('hung up')) engagementModifier -= 5;

    } else if (type === 'text') {
      switch (outcome) {
        case 'delivered': behaviorScore = 5; break;
        case 'waiting': behaviorScore = 5; break;
        case 'not_interested': behaviorScore = -15; break;
        case 'not_active': behaviorScore = -10; break;
      }

      if (notes.includes('positive') || notes.includes('interested')) behaviorScore = 20;

      let platformMultiplier = 1.0;
      const platform = (extraData.platform || 'whatsapp').toLowerCase();
      if (platform === 'whatsapp') platformMultiplier = 1.2;
      else if (platform === 'telegram') platformMultiplier = 1.0;
      else if (platform === 'sms') platformMultiplier = 0.9;
      else if (platform === 'messenger' || platform === 'imo') platformMultiplier = 0.8;

      const rawScore = baseScore + behaviorScore + engagementModifier;
      const finalScoreAdd = Math.round(rawScore * platformMultiplier);
      
      const parsedCurrent = parseInt(currentScore, 10) || 0;
      const newTotalScore = Math.max(0, Math.min(100, parsedCurrent + finalScoreAdd));
      return {
        scoreImpact: finalScoreAdd,
        newTotalScore,
        intent: this.classifyIntent(newTotalScore)
      };
    }

    const finalScoreAdd = baseScore + behaviorScore + engagementModifier;
    const parsedCurrent = parseInt(currentScore, 10) || 0;
    const newTotalScore = Math.max(0, Math.min(100, parsedCurrent + finalScoreAdd));

    return {
      scoreImpact: finalScoreAdd,
      newTotalScore,
      intent: this.classifyIntent(newTotalScore)
    };
  }

  static classifyIntent(score) {
    if (score <= 10) return { level: 'Cold', stage: 'New Lead' };
    if (score <= 30) return { level: 'Low Interest', stage: 'Contacted' };
    if (score <= 60) return { level: 'Warm', stage: 'Follow-Up Needed' };
    if (score <= 80) return { level: 'High Interest', stage: 'Presentation Scheduled' };
    return { level: 'Hot', stage: 'Closing' };
  }
}

export class InvitationNextActionService {
  static generate(score) {
    if (score <= 10) return { action: 'Re-invite after delay', days: 7 };
    if (score <= 30) return { action: 'Send reminder / different script', days: 2 };
    if (score <= 60) return { action: 'Send presentation', days: 1 };
    if (score <= 80) return { action: 'Call or follow-up urgently', days: 0 };
    return { action: 'Push closing flow immediately', days: 0 };
  }
}
