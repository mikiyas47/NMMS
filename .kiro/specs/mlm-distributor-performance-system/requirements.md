# Requirements Document

## Introduction

This feature extends the existing Prospects module of the MLM mobile app (React Native/Expo frontend, Laravel backend) into a complete **MLM Distributor Performance Operating System**. The existing system already handles contacts, pipeline stages, interest scoring, follow-up/closing logging, goal engine, rank/tree structure, and Chapa payments. This extension adds ten interconnected subsystems — Presentation Engine, Invitation System, Automation Engine, Priority Engine, Daily Execution System, Behavioral Intelligence, Prospect Experience (public pages), Onboarding Transition System, Duplication System, and Funnel Analytics — all designed to guide distributor behavior, feel motivational and gamified, and integrate with the existing rank/tree/wallet/goal systems.

---

## Glossary

- **Distributor**: An authenticated MLM network member who recruits prospects and earns commissions. Identified by `distributor_id`.
- **Prospect**: A person in a distributor's recruitment pipeline, tracked in the `prospects` table with stages from "New Lead" to "Joined".
- **Presentation**: A piece of content (video, PDF, compensation plan, testimonial, webinar replay, explainer video) managed in the Presentation Center and assigned to prospects.
- **Tracked_Link**: A unique, short URL generated per Prospect+Presentation or per Invitation that records engagement events when visited.
- **Invitation**: A structured outreach event (Zoom, Webinar, Hotel event, Product demo, Compensation plan session, One-on-one call, Live stream) sent to a prospect with a tracked link.
- **Automation_Rule**: A configurable event-condition-action rule that fires automatically when engagement events occur.
- **Priority_Score**: A computed integer (minimum 0, may exceed 100 when input metrics are high) per prospect representing urgency to contact, derived from engagement, recency, responsiveness, activity, presentation completion, webinar attendance, and follow-up gaps.
- **Daily_Dashboard**: The motivational home view showing the distributor's prioritized action list for the current day.
- **Public_Page**: A no-login web page (served at a unique URL) personalized with distributor branding that tracks prospect engagement.
- **Onboarding_Flow**: The automated sequence triggered when a prospect's stage transitions to "Joined", creating a distributor account and guiding first actions.
- **Playbook**: A step-by-step recruitment script or coaching guide stored in the Duplication System.
- **Funnel**: The ordered conversion path: Contacts → Prospects → Invitations → Presentations → Follow-ups → Closings → Joins.
- **Engagement_Event**: Any trackable prospect action: link opened, video watched (with %), PDF page viewed, webinar attended, invitation accepted/declined.
- **Interest_Score**: The existing 0–100 score on the `prospects` table, recalculated by `Prospect::recalculateScore()`.
- **Goal_Engine**: The existing `/goal-engine` API that generates daily tasks and rank progress.
- **Streak**: A consecutive-day count of a distributor completing their daily action targets.
- **Badge**: A gamification award earned by reaching milestones (first invite sent, first presentation assigned, first recruit joined, etc.).
- **Sponsor**: The distributor who recruited a new distributor; stored as `upline_id` on the `distributors` table.
- **CT / AL**: The lowest and highest MLM ranks in the existing rank system.

---

## Requirements

### Requirement 1: Presentation Center — Content Management

**User Story:** As a distributor, I want to upload and manage presentation content (videos, PDFs, compensation plans, testimonials, webinar replays, explainer videos), so that I always have professional materials ready to share with prospects.

#### Acceptance Criteria

1. THE Presentation_Center SHALL support the following content types: `video`, `pdf`, `compensation_plan`, `testimonial`, `webinar_replay`, `explainer_video`.
2. WHEN a distributor submits a new presentation with a title, content type, and either a file upload or an external URL, THE Presentation_Center SHALL store the presentation and associate it with the distributor's `distributor_id`.
3. WHEN a distributor uploads a file, THE Presentation_Center SHALL accept files up to 200 MB for videos and up to 50 MB for PDFs.
4. IF a distributor submits a presentation without both a title and either a file or a URL, THEN THE Presentation_Center SHALL return a descriptive validation error and reject the submission.
5. THE Presentation_Center SHALL allow a distributor to edit the title, description, thumbnail, and external URL of any presentation they own.
6. THE Presentation_Center SHALL allow a distributor to delete any presentation they own, and SHALL cascade-delete all associated tracked links and engagement records.
7. WHEN a distributor requests their presentation list, THE Presentation_Center SHALL return all presentations owned by that distributor ordered by creation date descending.
8. THE Presentation_Center SHALL store a `conversion_rate` per presentation, recalculated each time an assignment outcome is recorded.
9. THE Presentation_Center SHALL store an `avg_engagement_score` per presentation, recalculated as the mean of all engagement scores across all assignments.

### Requirement 2: Presentation Assignment and Tracked Link Generation

**User Story:** As a distributor, I want to assign a presentation to a specific prospect and get a unique tracked link, so that I can share it and know exactly when and how the prospect engages with it.

#### Acceptance Criteria

1. WHEN a distributor assigns a presentation to a prospect, THE Presentation_Engine SHALL create an assignment record linking `presentation_id`, `prospect_id`, and `distributor_id`, with status `sent`.
2. WHEN an assignment is created, THE Presentation_Engine SHALL generate a globally unique `Tracked_Link` token (minimum 12 characters, URL-safe) and store it with the assignment.
3. THE Presentation_Engine SHALL expose the tracked link as a public URL in the format `/p/{token}` that requires no authentication to visit.
4. WHEN a prospect visits `/p/{token}`, THE Presentation_Engine SHALL record an `opened` engagement event with a UTC timestamp and the visitor's IP address.
5. WHEN a prospect visits `/p/{token}` for a video presentation, THE Presentation_Engine SHALL accept periodic progress-ping requests and record `watch_percent` (0–100 integer) per ping.
6. WHEN a prospect visits `/p/{token}` for a PDF presentation, THE Presentation_Engine SHALL record the highest `page_reached` integer per session, not exceeding the total page count.
7. THE Presentation_Engine SHALL compute an `engagement_score` per assignment as: `(watch_percent × 0.6) + (page_completion_percent × 0.3) + (time_spent_minutes × 0.1)`, capped at 100.
8. WHEN an assignment's `watch_percent` reaches 100 or `page_reached` equals the total page count, THE Presentation_Engine SHALL fire a `presentation_completed` engagement event and, only if the event fires successfully, update the assignment status to `completed`.
9. THE Presentation_Engine SHALL allow a distributor to view all assignments for a given prospect, ordered by assignment date descending.
10. IF a tracked link token does not exist, THEN THE Presentation_Engine SHALL return an HTTP 404 response.

### Requirement 3: Invitation System

**User Story:** As a distributor, I want a structured flow to invite a prospect to a specific event type, generate a script and tracked link, and track the prospect's response, so that my invitations are consistent and measurable.

#### Acceptance Criteria

1. THE Invitation_System SHALL support the following invitation types: `zoom`, `webinar`, `hotel_event`, `product_demo`, `compensation_plan_session`, `one_on_one_call`, `live_stream`.
2. WHEN a distributor creates an invitation for a prospect with an invitation type and optional scheduled datetime, THE Invitation_System SHALL store the invitation with status `sent` and generate a unique `Tracked_Link` token.
3. WHEN an invitation is created, THE Invitation_System SHALL return a pre-written script template personalized with the prospect's name and the distributor's name.
4. THE Invitation_System SHALL expose the invitation tracked link as a public URL in the format `/invite/{token}` that requires no authentication.
5. WHEN a prospect visits `/invite/{token}`, THE Invitation_System SHALL record an `opened` event and update the invitation status to `opened`.
6. WHEN a prospect clicks an acceptance action on the `/invite/{token}` page, THE Invitation_System SHALL record an `accepted` event and update the invitation status to `accepted`.
7. WHEN a prospect clicks a decline action on the `/invite/{token}` page, THE Invitation_System SHALL record a `declined` event and update the invitation status to `declined`.
8. WHEN an invitation status changes to `accepted`, THE Invitation_System SHALL automatically advance the prospect's pipeline stage to `Invited` if the current stage is `New Lead` or `Contacted`. IF the pipeline stage advancement fails, THEN THE Invitation_System SHALL retain the invitation status as `accepted` and log the failure.
9. THE Invitation_System SHALL allow a distributor to manually update an invitation status to `ignored` after 48 hours with no response.
10. WHEN a distributor requests their invitation list for a prospect, THE Invitation_System SHALL return all invitations ordered by creation date descending, including status and engagement timestamps.
11. IF a distributor creates an invitation for a prospect_id that does not belong to their `distributor_id`, THEN THE Invitation_System SHALL return an HTTP 403 error.

### Requirement 4: Automation Engine — Event-Driven Rules

**User Story:** As a distributor, I want to configure automation rules that fire automatically when engagement events occur, so that the system guides my follow-up actions without me having to manually monitor every prospect.

#### Acceptance Criteria

1. THE Automation_Engine SHALL support trigger event types: `presentation_watch_percent_reached`, `invitation_status_changed`, `no_response_days`, `webinar_attended`, `stage_changed`, `interest_score_changed`.
2. THE Automation_Engine SHALL support action types: `set_interest_level`, `add_interest_score`, `create_followup_reminder`, `advance_stage`, `send_push_notification`, `add_tag`.
3. WHEN a distributor creates an automation rule with a trigger, optional condition, and action, THE Automation_Engine SHALL store the rule associated with the distributor's `distributor_id`.
4. WHEN an engagement event fires, THE Automation_Engine SHALL evaluate all active automation rules for the relevant distributor and execute any rules whose trigger and condition match.
5. WHEN the trigger `presentation_watch_percent_reached` fires, THE Automation_Engine SHALL execute the configured action regardless of the actual watch percentage value at execution time.
6. WHEN the trigger `no_response_days` fires and the prospect has had no engagement event for the configured number of days (minimum 1, maximum 30), THE Automation_Engine SHALL execute the configured action.
7. WHEN the trigger `webinar_attended` fires, THE Automation_Engine SHALL add the configured score delta to the prospect's `interest_score` and call `recalculateScore()`.
8. THE Automation_Engine SHALL log each rule execution with the rule ID, prospect ID, trigger event, action taken, and UTC timestamp.
9. IF an automation rule action fails, THEN THE Automation_Engine SHALL log the failure, and only if the failure logging succeeds, continue processing remaining rules.
10. THE Automation_Engine SHALL allow a distributor to enable or disable any rule they own without deleting it.
11. THE Automation_Engine SHALL provide 5 pre-built default rules for every new distributor: (a) watch >80% → set Hot, (b) no response 3 days → create reminder, (c) webinar attended → score +20, (d) invitation accepted → advance stage to Invited, (e) stage changed to Joined → send congratulations notification.

### Requirement 5: Priority Engine — Prospect Scoring and Ranked View

**User Story:** As a distributor, I want to see my prospects ranked by a Priority Score so that I always know exactly who to contact first.

#### Acceptance Criteria

1. THE Priority_Engine SHALL compute a `Priority_Score` (integer, minimum 0, no upper cap) for each prospect using: engagement score (30%), recency inverse `100/(1+days)` (20%), responsiveness rate (20%), presentation completion (15%), webinar attendance count (10%), follow-up gap inverse `100/(1+days)` (5%).
2. WHEN any of the following events occur, THE Priority_Engine SHALL recompute the prospect's `Priority_Score` within 5 seconds: engagement event recorded, stage changed, follow-up logged, invitation status changed.
3. THE Priority_Engine SHALL expose a `/prospects/priority` endpoint returning active prospects (excluding Joined, Rejected, Inactive) sorted by `Priority_Score` descending.
4. THE Priority_Engine SHALL generate a recommendation string per prospect: Score ≥ 80 AND last engagement within 24h → "Highly engaged. Call now."; Score ≥ 60 AND no contact 2+ days → "High intent. Follow up today."; Score < 30 AND 3+ ignored follow-ups → "Pause outreach. Re-engage in 7 days."; Score < 20 AND last activity > 14 days → "Low engagement. Consider removing from active pipeline."
5. THE Priority_Engine SHALL store the computed `Priority_Score` and `recommendation` on the prospect record.
6. WHEN a distributor views "Highest Priority Leads Today", THE Priority_Engine SHALL return the top 10 prospects by `Priority_Score` with recommendation strings.

### Requirement 6: Daily Execution System — Action Dashboard

**User Story:** As a distributor, I want a daily action dashboard that tells me exactly what to do today so that I stay focused and make consistent progress.

#### Acceptance Criteria

1. THE Daily_Dashboard SHALL generate a personalized daily action list containing: follow-up tasks (overdue or today-due next actions), invitation tasks (New Lead/Contacted with no invite in 7+ days), presentation tasks (Invited/Awaiting Response with no presentation assigned), closing tasks (Closing stage).
2. WHEN the Goal_Engine has active goals, THE Daily_Dashboard SHALL align task counts with the distributor's current goal targets.
3. THE Daily_Dashboard SHALL display a motivational headline summarizing the day's focus.
4. WHEN a distributor completes a task, THE Daily_Dashboard SHALL mark it complete, update the streak counter, and check badge eligibility.
5. THE Daily_Dashboard SHALL maintain a `streak` counter that increments for each calendar day all tasks are completed, and resets to 0 only if a full calendar day passes with no task completion.
6. THE Daily_Dashboard SHALL award badges for: first daily list completed, 3-day streak, 7-day streak, 30-day streak, first invitation sent, first presentation assigned, first prospect joined, 10 prospects in pipeline, first closing attempt.
7. WHEN a badge is earned, THE Daily_Dashboard SHALL store the badge record and send a push notification only when a badge is actually awarded.
8. THE Daily_Dashboard SHALL display the distributor's current streak count and earned badges.
9. THE Daily_Dashboard SHALL expose a `/daily-dashboard` endpoint accessible to the authenticated distributor returning: action list, streak, badges, and motivational headline.

### Requirement 7: Behavioral Intelligence — Smart Recommendations

**User Story:** As a distributor, I want the system to detect behavioral patterns and surface smart recommendations so that I act at the right time with the right message.

#### Acceptance Criteria

1. THE Behavioral_Intelligence_Engine SHALL detect high-intent signals: watch percent ≥ 80%, invitation accepted within 2 hours, public page visited 3+ times in 24 hours, interest score increased 20+ points in 7 days.
2. THE Behavioral_Intelligence_Engine SHALL detect disengagement patterns: 3+ follow-ups with no response, invitation opened but not accepted within 48 hours, presentation not opened within 72 hours of assignment, interest score decreased 15+ points in 7 days.
3. WHEN a high-intent signal is detected, THE Behavioral_Intelligence_Engine SHALL create a recommendation record with type `high_intent`, prospect ID, action suggestion, and UTC timestamp.
4. WHEN a disengagement pattern is detected, THE Behavioral_Intelligence_Engine SHALL create a recommendation record with type `disengagement`, prospect ID, action suggestion, and UTC timestamp.
5. THE Behavioral_Intelligence_Engine SHALL expose `/prospects/{id}/recommendations` returning all active recommendations ordered by creation date descending.
6. THE Behavioral_Intelligence_Engine SHALL expose `/recommendations/active` returning all unread recommendations for the authenticated distributor.
7. WHEN a distributor marks a recommendation as read, THE Behavioral_Intelligence_Engine SHALL update the `read_at` timestamp.
8. THE Behavioral_Intelligence_Engine SHALL run pattern detection for all active prospects at least once every 6 hours via a scheduled background job.

### Requirement 8: Prospect Experience — Public Pages

**User Story:** As a distributor, I want prospects to land on a personalized, branded public page when they click my tracked links so that their engagement is automatically recorded.

#### Acceptance Criteria

1. THE Public_Page_Server SHALL serve no-auth pages at `/invite/{token}` and `/p/{token}`.
2. WHEN a public page is rendered, THE Public_Page_Server SHALL display the distributor's name, profile photo (if set), and a personalized greeting using the prospect's name.
3. THE Public_Page_Server SHALL support page types: `opportunity`, `webinar`, `product`, `compensation_plan`.
4. WHEN a prospect visits any public page, THE Public_Page_Server SHALL record a `page_visit` engagement event with token, visitor IP, user agent, and UTC timestamp.
5. WHEN a prospect submits their name and phone number on a public page, THE Public_Page_Server SHALL store the submission and create a `lead_captured` engagement event.
6. THE Public_Page_Server SHALL attribute all engagement events to the distributor who owns the tracked link.
7. WHEN a video is embedded on a public page, THE Public_Page_Server SHALL send progress-ping events every 10 seconds recording `watch_percent`.
8. IF a public page token is expired or does not exist, THEN THE Public_Page_Server SHALL display "This link is no longer active" without exposing any distributor or prospect data.

### Requirement 9: Onboarding Transition System

**User Story:** As a distributor, I want the system to automatically create a distributor account for a prospect when they join and guide them through their first actions so that duplication happens smoothly.

#### Acceptance Criteria

1. WHEN a prospect's pipeline stage is changed to `Joined`, THE Onboarding_System SHALL automatically create a pending distributor account using the prospect's name, phone, and email, with the current distributor set as `upline_id`.
2. WHEN the pending distributor account is created, THE Onboarding_System SHALL send a welcome push notification with a link to set their password.
3. THE Onboarding_System SHALL track 5 first-action milestones: first invitation sent, first presentation assigned, first prospect added, first recruit joined, onboarding checklist completed.
4. WHEN a new distributor completes all 5 milestones, THE Onboarding_System SHALL mark onboarding complete, award an "Onboarding Complete" badge, and notify their sponsor.
5. THE Onboarding_System SHALL present a "First 10 Contact Challenge" prompting new distributors to add 10 contacts within their first 7 days, displaying progress.
6. WHEN a new distributor adds 10 or more contacts within 7 days of account creation, THE Onboarding_System SHALL award a "First 10 Challenge" badge and notify their sponsor.
7. THE Onboarding_System SHALL expose `/onboarding/status` returning milestone completion status, challenge progress, and badge list.
8. IF a prospect's email already exists as an active distributor account, THEN THE Onboarding_System SHALL log a `duplicate_account_skipped` event without sending a duplicate welcome notification.

### Requirement 10: Duplication System — Playbooks and Scripts

**User Story:** As a distributor, I want access to recruitment playbooks, step-by-step scripts, and coaching guides so that I can duplicate my success and teach my team to recruit consistently.

#### Acceptance Criteria

1. THE Duplication_System SHALL store playbooks with: title, description, steps (ordered list), category (`invitation`, `presentation`, `closing`, `objection_handling`), and visibility (`global` or `personal`).
2. THE Duplication_System SHALL provide at least 4 pre-built global playbooks at system initialization, one per category.
3. WHEN a distributor creates a personal playbook, THE Duplication_System SHALL store it associated with their `distributor_id` and make it visible only to that distributor and their downline.
4. THE Duplication_System SHALL expose `/playbooks` returning all global playbooks plus the authenticated distributor's personal playbooks, ordered by category then title.
5. THE Duplication_System SHALL store script templates per invitation type with placeholders for `{prospect_name}` and `{distributor_name}`.
6. WHEN a distributor requests a script for a given invitation type and prospect, THE Duplication_System SHALL return the template with placeholders replaced with actual values.
7. THE Duplication_System SHALL track weekly recruiting goals and expose progress via `/duplication/weekly-goals`.
8. WHEN a distributor's weekly recruiting goal progress reaches 100%, THE Duplication_System SHALL award a "Weekly Goal Achieved" badge and send a push notification independently of whether the badge award succeeds.

### Requirement 11: Funnel Analytics

**User Story:** As a distributor, I want to see my full recruitment funnel with conversion rates at each stage so that I can identify where I'm losing prospects.

#### Acceptance Criteria

1. THE Funnel_Analytics_Engine SHALL compute funnel metrics across: Contacts → Prospects → Invitations Sent → Presentations Assigned → Follow-ups Logged → Closings Attempted → Joined.
2. THE Funnel_Analytics_Engine SHALL compute conversion rates for all 6 transitions as `(count at next stage / count at current stage) × 100`, rounded to one decimal place.
3. WHEN a distributor requests their funnel report, THE Funnel_Analytics_Engine SHALL return count and conversion rate for each stage plus an overall Contacts-to-Joined conversion rate.
4. THE Funnel_Analytics_Engine SHALL identify the weakest funnel stage as the transition with the lowest conversion rate among the 6 transitions (excluding the Contacts stage count itself) and include it as `weakest_stage`.
5. THE Funnel_Analytics_Engine SHALL generate a plain-language insight string for the weakest stage per the defined thresholds.
6. THE Funnel_Analytics_Engine SHALL support filtering by date range (start_date, end_date) as query parameters.
7. THE Funnel_Analytics_Engine SHALL expose `/funnel/report` returning full funnel data, weakest stage, and insight string.
8. THE Funnel_Analytics_Engine SHALL recompute funnel metrics on demand, not cached longer than 5 minutes.

### Requirement 12: Integration with Existing Systems

**User Story:** As a distributor, I want the new performance system to connect with my existing rank progress, goal engine, and wallet so that all my activity counts toward my MLM advancement.

#### Acceptance Criteria

1. WHEN a prospect's stage changes to `Joined` via any path in the new system, THE Integration_Layer SHALL trigger the existing rank recalculation logic.
2. WHEN the Daily_Dashboard generates its action list, THE Integration_Layer SHALL read current day's targets from the existing Goal_Engine and use them to set task counts.
3. WHEN a distributor completes a daily action list task, THE Integration_Layer SHALL log the activity to the existing Goal_Engine activity log.
4. WHEN a new distributor account is created by the Onboarding_System, THE Integration_Layer SHALL create the MLM tree node and wallet record using `MlmEngineService::processPurchase`.
5. THE Integration_Layer SHALL ensure all `ProspectActivity` records use the existing `prospect_activities` table schema with valid `activity_type` values.
6. WHEN the Priority_Engine recomputes a `Priority_Score`, THE Integration_Layer SHALL update `interest_score` on the `prospects` table if the absolute difference exceeds 5 points, including when Priority_Score drops to zero or goes negative.

### Requirement 13: Mobile-First UI and Gamification Standards

**User Story:** As a distributor, I want the app to feel motivational, fast, and game-like so that I stay engaged and use it every day.

#### Acceptance Criteria

1. THE Mobile_App SHALL render all new screens using the established dark-theme palette (`#1E1B4B` background, `#6366F1` accent, `#10B981` success, `#EF4444` danger) and `LinearGradient` card style.
2. THE Mobile_App SHALL display animated score bars, fade-in transitions, and color-coded priority indicators on all new list screens.
3. WHEN a distributor earns a badge, THE Mobile_App SHALL display a full-screen celebration animation before returning to the dashboard.
4. THE Mobile_App SHALL display the distributor's current streak count prominently on the Daily Dashboard with a flame icon at all streak values including zero.
5. WHEN a screen fails to load within 2 seconds of the screen load being initiated, THE Mobile_App SHALL display an error message and stop the loading attempt.
6. THE Mobile_App SHALL support pull-to-refresh on all list screens using the existing `RefreshControl` pattern.
7. THE Mobile_App SHALL display all monetary values in Ethiopian Birr (ETB).
8. WHEN a distributor taps a recommendation card, THE Mobile_App SHALL navigate directly to the relevant prospect's profile screen.
