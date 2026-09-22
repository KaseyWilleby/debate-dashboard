
'use client';

import * as React from 'react';
import { useLearningResources } from '../layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { LearningResource } from '@/lib/learning-resources';

const NsdaManual = {
  'Debate Events': {
    'Policy Debate': `Speech Times (8-minute format): 1AC (8), CX (3), 1NC (8), CX (3), 2AC (8), CX (3), 2NC (8), CX (3), 1NR (5), 1AR (5), 2NR (5), 2AR (5). Prep Time: 8 minutes per team.`,
    'Public Forum Debate': `Speech Times: First Speaker - Team A (4), First Speaker - Team B (4), Crossfire (3), Second Speaker - Team A (4), Second Speaker - Team B (4), Crossfire (3), Summary - First Speaker - Team A (3), Summary - First Speaker - Team B (3), Grand Crossfire (3), Final Focus - Second Speaker - Team A (2), Final Focus - Second Speaker - Team B (2). Prep Time: 3 minutes per team.`,
    'Lincoln-Douglas Debate': `Speech Times: Affirmative Constructive (6), Cross-Examination (3), Negative Constructive (7), Cross-Examination (3), First Affirmative Rebuttal (4), Negative Rebuttal (6), Second Affirmative Rebuttal (3). Prep Time: 4 minutes per debater.`,
    'World Schools Debate': `Team size: 3-5 members, 3 speak per debate. Speech Times: Proposition Speaker 1-3 (8 min each), Opposition Speaker 1-3 (8 min each), Opposition Reply (4), Proposition Reply (4). Points of Information (POIs) are allowed between the first and last minute of constructive speeches.`,
    'Big Questions Debate': `Speech Times: Affirmative Constructive (5), Cross-Examination (3), Negative Constructive (5), Cross-Examination (3), Affirmative Rebuttal (4), Negative Rebuttal (4), Affirmative Consolidation (3), Negative Consolidation (3), Affirmative Rationale (3), Negative Rationale (3). Prep Time: 3 minutes per debater.`,
  },
  'Speech Events': {
    'Original Oratory & Informative Speaking': 'Maximum time is 10 minutes. The speech must be the original work of the contestant. For Oratory, the speech must be persuasive. For Informative, visual aids are permitted.',
    'Extemporaneous Speaking': 'Contestants draw three topics on a current event question and select one. They have 30 minutes to prepare a speech that is a maximum of 7 minutes long. Notes are permitted but should be minimal.',
  },
  'Interpretation Events': {
    'General Rules': 'Maximum time is 10 minutes, including introduction. The performance must be from a single source of published, printed material. Scripts are not allowed.',
    'Dramatic & Humorous Interpretation': 'Solo performance events. No props or costumes are used. Performers must physically embody all characters.',
    'Duo Interpretation': 'Two competitors perform a scene. Competitors may not touch or look at each other.',
    'Program Oral Interpretation (POI)': 'A program of thematically-linked selections from at least two of the three genres: prose, poetry, and drama. A manuscript is required and may be used as a prop.',
  },
  'Congressional Debate': {
    'Rules': `A session is a legislative session modeled on the U.S. Congress. Speeches are up to 3 minutes, followed by a questioning period. A student who has given a speech may not be recognized for another speech until all others who wish to speak have done so. A presiding officer (PO) runs the session, recognizing speakers and ruling on motions. Students vote on legislation after a period of debate.`,
  }
};

const TfaManual = {
  'Debate Events': {
    'Policy Debate (CX)': `Time Limits: First Affirmative Constructive (8), Cross-Examination (3), First Negative Constructive (8), Cross-Examination (3), Second Affirmative Constructive (8), Cross-Examination (3), Second Negative Constructive (8), Cross-Examination (3), First Negative Rebuttal (5), First Affirmative Rebuttal (5), Second Negative Rebuttal (5), Second Affirmative Rebuttal (5). Prep Time: 10 minutes per team. Grace Period: 20 seconds.

Evidence Rules: Published evidence is required. Each debater must possess the full text of all evidence read. Evidence exchange must occur immediately upon request. Original context must be preserved. All evidence must be electronically retrievable and disclosed before the round. Computer/device use is permitted for accessing evidence, but internet connectivity must be disabled during rounds.

Procedure: Teams may request verification of evidence. Fabrication or distortion results in loss with minimum speaker points. Incomplete citations or missing evidence results in disregarding the evidence. Tournament disclosure requires full case and evidence sharing via TFA-approved platforms.`,

    'Lincoln-Douglas Debate (LD)': `Time Limits: Affirmative Constructive (6), Cross-Examination (3), Negative Constructive (7), Cross-Examination (3), First Affirmative Rebuttal (4), Negative Rebuttal (6), Second Affirmative Rebuttal (3). Prep Time: 4 minutes total per debater. Grace Period: 20 seconds.

Evidence Rules: Empirical claims should be supported by evidence. Debaters must possess full text of evidence. Evidence exchange upon request. Original context must be preserved. Electronic disclosure required via TFA-approved platforms before rounds.

Procedure: Questions permitted during cross-examination only. Evidence fabrication or distortion results in loss with minimum speaker points. Computer/device use permitted for accessing evidence only (no internet during rounds). Incomplete citations result in evidence being disregarded.`,

    'Public Forum Debate (PF)': `Time Limits: Team A Speaker 1 (4), Team B Speaker 1 (4), Crossfire (3), Team A Speaker 2 (4), Team B Speaker 2 (4), Crossfire (3), Team A Summary (3), Team B Summary (3), Grand Crossfire (3), Team A Final Focus (2), Team B Final Focus (2). Prep Time: 3 minutes per team. Grace Period: 20 seconds.

Evidence Rules: Paraphrasing is permitted in speech but not in crossfire. Full citations required when questioned. Teams must exchange all paraphrased and quoted evidence immediately upon request. Published sources required. Original context must be preserved.

Procedure: No new evidence in Final Focus speeches. Evidence fabrication results in loss with minimum speaker points. Computer/device use permitted for accessing evidence only (no internet during rounds). All evidence must be electronically retrievable and disclosed before rounds.`,

    'World Schools Debate (WSD)': `Time Limits: First Proposition (8), First Opposition (8), Second Proposition (8), Second Opposition (8), Third Proposition (8), Third Opposition (8), Opposition Reply (4), Proposition Reply (4). No prep time allowed during rounds. Grace Period: 20 seconds.

Team Composition: 3-5 team members, exactly 3 speakers per debate. Different speaker combinations allowed in different rounds.

Points of Information (POIs): Permitted from 1-minute mark to 7-minute mark of constructive speeches. Offering team stands to signal POI request. Speaking team may accept or decline. If accepted, POI limited to 15 seconds. Maximum 2 POIs per speaker.

Procedure: Reply speeches delivered by first or second speaker only (not third). Reply speeches summarize major issues - no new arguments. Cases should analyze resolution from multiple perspectives. Style and strategy matter alongside content.`,

    'Congressional Debate (Congress)': `Time Limits: Speeches limited to 3 minutes. First Affirmative and First Negative speeches on legislation automatically receive 3 minutes. Subsequent speeches receive time based on chamber decision. Questioning period follows each speech (typically 1-2 minutes).

Procedure: Session operates as legislative chamber. Presiding Officer (PO) manages proceedings, recognizes speakers, rules on motions. Precedence/Recency used for speaker selection - new speakers get priority. After legislation is debated, chamber votes. Speeches alternate between Affirmative and Negative when possible.

Limitations: No contestant may speak twice on same question until all who wish to speak have spoken once. Direct questioning allowed during questioning period. Motions permitted for parliamentary procedure (Previous Question, table, refer to committee, etc.).`
  },
  'Speaking Events': {
    'Extemporaneous Speaking - United States (US Extemp)': `Time Limit: 7 minutes maximum. Grace Period: 20 seconds.

Preparation: Students draw 3 topics on current US events and choose one. 30 minutes preparation time. Topics focus on US domestic policy, politics, economics, and social issues. Students may consult research materials during prep (printed articles, notes).

Content Requirements: Speech must analyze the drawn question. Requires introduction, body with multiple points supported by evidence, and conclusion. Sources must be cited (author, publication, date). Recency of evidence matters - current analysis expected.

Procedure: Notes permitted during speech (typically note cards). Visual aids not permitted. Transitional phrases between main points: Maximum 6-word limit for transitions. Speeches exceeding time limit with grace period will be penalized.`,

    'Extemporaneous Speaking - International (Int Extemp)': `Time Limit: 7 minutes maximum. Grace Period: 20 seconds.

Preparation: Students draw 3 topics on international current events and choose one. 30 minutes preparation time. Topics focus on international relations, foreign policy, global economics, world conflicts. Students may consult research materials during prep.

Content Requirements: Speech must analyze the drawn question with international focus. Requires introduction, body with multiple points supported by evidence, and conclusion. Sources must be cited (author, publication, date). Current analysis of global issues expected.

Procedure: Notes permitted during speech (typically note cards). Visual aids not permitted. Transitional phrases between main points: Maximum 6-word limit for transitions. Understanding of international context and multiple perspectives expected.`,

    'Original Oratory (OO)': `Time Limit: 10 minutes maximum. Grace Period: 20 seconds.

Content Requirements: Must be original work of student. Persuasive speech on topic of student's choosing. Should address significant issue and advocate for specific position or action. No visual aids permitted. Manuscript not permitted during performance.

Originality: Outside sources may be quoted/cited for supporting evidence, but analysis and main arguments must be original. Direct quotations should be clearly identified and cited.

Procedure: Memorized delivery required. May use any persuasive speaking techniques. Judged on content (analysis, argumentation, evidence), structure (organization, clarity), and delivery (vocal variety, physical expression, audience engagement). Speeches exceeding time limit with grace period will be penalized.`,

    'Informative Speaking (Info)': `Time Limit: 10 minutes maximum. Grace Period: 20 seconds.

Content Requirements: Must be original work of student. Informative speech on topic of student's choosing. Goal is to educate audience, not persuade. Should present balanced information. Outside sources must be cited.

Visual Aids: May use visual aids during speech. Visual aids must be created by student. No electronic devices as visual aids. Visual aids should enhance understanding, not serve as crutch.

Procedure: Memorized delivery required. Manuscript not permitted during performance. Topics should be substantive and educational. Judged on content (depth of information, clarity), structure (organization, transitions), delivery (vocal quality, physical expression), and effective use of visual aids if employed.`
  },
  'Interpretation Events': {
    'Duet Acting (DA)': `Time Limit: 10 minutes maximum (including introduction). Grace Period: 20 seconds.

Material Selection: Cutting from single published play or screenplay. Material must be from same source - cannot combine multiple sources. Introduction required explaining title, author, and context.

Performance Rules: Performed by two contestants. Physical contact permitted (distinguishes from Duo Interpretation). Eye contact between performers permitted. No props, costumes, or make-up. May use chairs or stools if provided by tournament. Both performers must contribute substantially - cannot be one-sided.

Procedure: Must hold manuscript throughout performance. Performers should establish clear character choices. Off-book encouraged but manuscript required as safety. Judged on character development, interaction between performers, emotional connection, and technical skill.`,

    'Duo Interpretation (DI)': `Time Limit: 10 minutes maximum (including introduction). Grace Period: 20 seconds.

Material Selection: Cutting from single published source. May be play, story, novel, or poetry. Must be from one source - cannot combine multiple sources. Introduction required explaining title, author, and context. Humorous or serious material acceptable.

Performance Rules: Performed by two contestants. NO physical contact between performers permitted. NO eye contact between performers permitted (focus off-stage). No props, costumes, or make-up. Both performers must contribute substantially to performance.

Procedure: Must hold manuscript throughout performance. Performers should create distinct characters. Off-book encouraged but manuscript required. Judged on character development, chemistry despite no eye contact/touch, emotional range, and storytelling. Transitional phrases between scenes/beats: Maximum 6-word limit.`,

    'Dramatic Interpretation (Dramt Int)': `Time Limit: 10 minutes maximum (including introduction). Grace Period: 20 seconds.

Material Selection: Cutting from single published source (play, story, novel, poetry). Must be serious/dramatic material. Cannot combine multiple sources. Introduction required explaining title, author, and context.

Performance Rules: Solo performance. Performer must portray all characters through vocal and physical choices. No props, costumes, or make-up. No chairs or furniture. Must hold manuscript throughout performance (though off-book encouraged).

Procedure: Performer should establish clear character distinctions. Emotional depth and connection to material essential. Judged on character development, emotional range, technical execution, and storytelling. Transitional phrases between scenes/characters: Maximum 6-word limit for transitions.`,

    'Humorous Interpretation (Hum Int)': `Time Limit: 10 minutes maximum (including introduction). Grace Period: 20 seconds.

Material Selection: Cutting from single published source (play, story, novel, poetry). Must be humorous material. Cannot combine multiple sources. Introduction required explaining title, author, and context.

Performance Rules: Solo performance. Performer must portray all characters through vocal and physical choices. No props, costumes, or make-up. No chairs or furniture. Must hold manuscript throughout performance (though off-book encouraged).

Procedure: Performer should establish clear character distinctions using humor. Comic timing essential. Humor should arise from character choices and situations, not just jokes. Judged on character development, comedic timing, technical skill, and entertainment value. Transitional phrases between scenes/characters: Maximum 6-word limit for transitions.`,

    'Program Oral Interpretation (POI)': `Time Limit: 10 minutes maximum (including introduction). Grace Period: 20 seconds.

Material Selection: Program of thematically-linked pieces from multiple published sources. Must include at least 2 of 3 genres: prose, poetry, drama. Minimum of 3 separate pieces required. Introduction required explaining theme and pieces. Cannot use single source - multiple authors/works required.

Performance Rules: Solo performance. Must hold manuscript throughout (manuscript may be used as prop/blocking element). No other props, costumes, or make-up. Performer may portray characters or serve as narrator. Program should flow cohesively around central theme.

Procedure: Introduction should establish theme and connect pieces. Transitions between pieces should be smooth and support theme. Judged on theme development, piece selection and connection, performance quality across genres, and manuscript use. Demonstrates versatility across interpretation styles.`
  }
};

export default function StandingRulesPage() {
  const { resources } = useLearningResources();

  const resourcesWithRules = React.useMemo(() => {
    return resources.filter(r => r.rules && (r.rules.NSDA || r.rules.TFA || r.rules.UIL));
  }, [resources]);

  const events = React.useMemo(() => {
    return [...new Set(resourcesWithRules.map(r => r.event))];
  }, [resourcesWithRules]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Standing Rules</h1>
        <p className="text-muted-foreground">
          A quick reference guide for event rules from major organizations.
        </p>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>NSDA Unified Manual</CardTitle>
            <CardDescription>Core rules for major NSDA events. For complete, official rules, always consult the full manual.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full space-y-4">
                {Object.entries(NsdaManual).map(([category, events]) => (
                    <AccordionItem value={category} key={category} className="border rounded-lg">
                        <AccordionTrigger className="p-4 hover:no-underline font-headline text-lg">{category}</AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 border-t">
                            <Accordion type="multiple" className="w-full">
                                {Object.entries(events).map(([eventName, rule]) => (
                                    <AccordionItem value={`${category}-${eventName}`} key={`${category}-${eventName}`}>
                                        <AccordionTrigger>{eventName}</AccordionTrigger>
                                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                            {rule}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>TFA Standing Rules</CardTitle>
            <CardDescription>Official Texas Forensic Association event rules. Includes time limits, evidence requirements, and procedures for all TFA events.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full space-y-4">
                {Object.entries(TfaManual).map(([category, events]) => (
                    <AccordionItem value={`tfa-${category}`} key={`tfa-${category}`} className="border rounded-lg">
                        <AccordionTrigger className="p-4 hover:no-underline font-headline text-lg">{category}</AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 border-t">
                            <Accordion type="multiple" className="w-full">
                                {Object.entries(events).map(([eventName, rule]) => (
                                    <AccordionItem value={`tfa-${category}-${eventName}`} key={`tfa-${category}-${eventName}`}>
                                        <AccordionTrigger>{eventName}</AccordionTrigger>
                                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                            {rule}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Event Rules by Organization</CardTitle>
            <CardDescription>Official rules for various speech and debate events, sourced from learning resources.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full space-y-4">
            {events.map(event => {
                const eventResources = resourcesWithRules.filter(r => r.event === event);
                return (
                <AccordionItem value={event} key={event} className="border rounded-lg">
                    <AccordionTrigger className="p-4 hover:no-underline font-headline text-lg">{event}</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0 border-t">
                    <Accordion type="multiple" className="w-full">
                        {eventResources.map(resource => (
                        <React.Fragment key={resource.id}>
                            {resource.rules?.NSDA && (
                            <AccordionItem value={`${resource.id}-nsda`}>
                                <AccordionTrigger>NSDA</AccordionTrigger>
                                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                {resource.rules.NSDA}
                                </AccordionContent>
                            </AccordionItem>
                            )}
                            {resource.rules?.TFA && (
                            <AccordionItem value={`${resource.id}-tfa`}>
                                <AccordionTrigger>TFA</AccordionTrigger>
                                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                {resource.rules.TFA}
                                </AccordionContent>
                            </AccordionItem>
                            )}
                            {resource.rules?.UIL && (
                            <AccordionItem value={`${resource.id}-uil`}>
                                <AccordionTrigger>UIL</AccordionTrigger>
                                <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                {resource.rules.UIL}
                                </AccordionContent>
                            </AccordionItem>
                            )}
                        </React.Fragment>
                        ))}
                    </Accordion>
                    </AccordionContent>
                </AccordionItem>
                )
            })}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
