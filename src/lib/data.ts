
import type { User, Session, CongressDocket } from '@/lib/types';
import { addDays, format } from 'date-fns';

export const users: User[] = [
  { id: '1', name: 'Admin Adam', username: 'admin', email: 'admin@example.com', role: 'admin', avatarUrl: '' },
  { id: '2', name: 'Varsity Val', username: 'varsity', email: 'varsity@example.com', role: 'varsity', avatarUrl: '' },
  { id: '3', name: 'Novice Nick', username: 'novice', email: 'novice@example.com', role: 'novice', avatarUrl: '' },
  { id: '4', name: 'Varsity Vera', username: 'vera', email: 'vera@example.com', role: 'varsity', avatarUrl: '' },
  { id: '5', name: 'Novice Nate', username: 'nate', email: 'nate@example.com', role: 'novice', avatarUrl: '' },
  { id: '6', name: 'Kasey Willeby', username: 'Kasey.Willeby', email: 'Kasey.Willeby@cfisd.net', role: 'admin', avatarUrl: '' },
];

export const sessions: Session[] = [];

export const congressDockets: CongressDocket[] = [
  {
    id: 'docket_1',
    name: 'TFA State 2025 - Prelims',
    items: [
      { 
        id: 'item_1_1', 
        title: 'A Bill to Establish a National Carbon Tax',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. A tax of $40 per metric ton of CO2 equivalent shall be levied on all greenhouse gas emissions from sources covered under the Environmental Protection Agency's Greenhouse Gas Reporting Program.
SECTION 2. The revenue generated from this tax shall be returned to all legal residents of the United States on an equal, per-capita basis via a quarterly dividend.
SECTION 3. The tax rate shall increase annually by 5% plus the rate of inflation.
SECTION 4. The Department of the Treasury shall be responsible for the collection of the tax and distribution of the dividend. The Environmental Protection Agency shall be responsible for monitoring and verifying emissions.
SECTION 5. This legislation shall take effect on January 1st, 2026.
`
      },
      { 
        id: 'item_1_2', 
        title: 'A Resolution to Ratify the Treaty on the Prohibition of Nuclear Weapons',
        fullText: `
WHEREAS, the continued existence of nuclear weapons poses a threat to all humanity; and
WHEREAS, the Treaty on the Prohibition of Nuclear Weapons (TPNW) is a landmark international agreement that comprehensively prohibits nuclear weapons; and
WHEREAS, United States leadership is critical for global disarmament efforts;
RESOLVED, That this Student Congress urges the President of the United States to sign and the Senate to ratify the Treaty on the Prohibition of Nuclear Weapons.
`
      },
      { 
        id: 'item_1_3', 
        title: 'A Bill to Implement a Universal Basic Income',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. The Department of the Treasury shall provide a Universal Basic Income (UBI) of $1,200 per month to every citizen of the United States over the age of 18.
SECTION 2. This UBI shall replace all other federal non-disability-related social welfare programs, including but not limited to Temporary Assistance for Needy Families (TANF) and the Supplemental Nutrition Assistance Program (SNAP).
SECTION 3. Funding for the UBI shall be sourced from the consolidation of replaced welfare programs and the introduction of a 10% Value-Added Tax (VAT) on all goods and services.
SECTION 4. The Internal Revenue Service will oversee the implementation and administration of this program.
SECTION 5. This legislation will take effect at the start of the next fiscal year.
`
      },
      { 
        id: 'item_1_4', 
        title: 'A Resolution to Condemn Human Rights Abuses in Xanadu',
        fullText: `
WHEREAS, numerous international reports from organizations such as Amnesty International and Human Rights Watch have documented systematic human rights violations in the fictional nation of Xanadu; and
WHEREAS, these violations include the suppression of free speech, political imprisonment, and forced labor; and
WHEREAS, the United States has a moral and diplomatic obligation to stand against such atrocities;
RESOLVED, That this Student Congress formally condemns the government of Xanadu for its gross violations of human rights and calls upon the President to impose targeted sanctions on officials responsible.
`
      },
      { 
        id: 'item_1_5', 
        title: 'A Bill to Reform Federal Sentencing Guidelines',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. Mandatory minimum sentences for all non-violent federal drug offenses are hereby abolished.
SECTION 2. Federal judges shall have full discretion to determine appropriate sentences for these offenses, considering individual circumstances and the nature of the crime.
SECTION 3. This legislation shall apply retroactively, allowing for the resentencing of currently incarcerated individuals convicted under previous mandatory minimum guidelines.
SECTION 4. The United States Sentencing Commission shall be tasked with providing revised, non-binding guidelines to assist judges in this process.
SECTION 5. This act shall take effect immediately upon passage.
`
      },
    ]
  },
  {
    id: 'docket_2',
    name: 'NSDA Nationals 2025 - Finals',
    items: [
      { 
        id: 'item_2_1', 
        title: 'A Bill to Lower the Voting Age to 16',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. The 26th Amendment of the United States Constitution shall be amended to lower the legal voting age from eighteen to sixteen for all federal elections.
SECTION 2. States shall be encouraged, through federal grants administered by the Election Assistance Commission, to similarly lower the voting age for state and local elections.
SECTION 3. The Department of Education shall develop and distribute a standardized civics curriculum to all high schools to prepare students for voting.
SECTION 4. This act shall take effect for the next federal election cycle following its ratification.
`
      },
      { 
        id: 'item_2_2', 
        title: 'A Resolution to Join the International Criminal Court',
        fullText: `
WHEREAS, the International Criminal Court (ICC) is the only permanent international court with jurisdiction to prosecute individuals for the international crimes of genocide, crimes against humanity, war crimes, and the crime of aggression; and
WHEREAS, United States participation would strengthen the court's legitimacy and global reach; and
WHEREAS, concerns about sovereignty can be addressed through the principle of complementarity, which gives precedence to national judicial systems;
RESOLVED, By this Student Congress that the United States should accede to the Rome Statute and become a full member of the International Criminal Court.
`
      },
      { 
        id: 'item_2_3', 
        title: 'A Bill to Subsidize Renewable Energy Infrastructure',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. A federal fund of $500 billion shall be established, to be disbursed over ten years, for the purpose of providing grants and loan guarantees for the construction of new renewable energy projects, including solar, wind, geothermal, and hydroelectric power plants.
SECTION 2. A tax credit of 30% shall be offered to any company or individual for the installation of new energy storage systems.
SECTION 3. The Department of Energy will oversee the administration of these programs.
SECTION 4. This legislation will be funded by repealing existing subsidies for the fossil fuel industry.
SECTION 5. This legislation shall take effect at the beginning of the next fiscal year.
`
      },
      { 
        id: 'item_2_4', 
        title: 'A Bill to Restructure the Supreme Court',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. The number of Justices on the Supreme Court of the United States shall be fixed at thirteen.
SECTION 2. Each of the thirteen federal judicial circuits shall be represented by one Justice on the Supreme Court.
SECTION 3. Justices shall serve a non-renewable term of 18 years.
SECTION 4. The appointment process will remain as defined in Article II, Section 2 of the U.S. Constitution.
SECTION 5. This legislation will be implemented gradually, with new appointments being made only upon the retirement, resignation, or death of a current Justice, until all thirteen seats are filled under the new structure.
`
      },
    ]
  },
  {
    id: 'docket_3',
    name: 'Practice Docket - Economic Policy',
    items: [
      { 
        id: 'item_3_1', 
        title: 'A Bill to Regulate Cryptocurrency Markets',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. All cryptocurrency exchanges operating in the United States must register with the Securities and Exchange Commission (SEC) and comply with existing financial regulations.
SECTION 2. "Stablecoins" shall be required to maintain a 1:1 reserve of equivalent fiat currency, to be audited quarterly by a certified third party.
SECTION 3. The SEC and the Commodity Futures Trading Commission (CFTC) shall establish a joint task force to clarify jurisdiction and create a unified regulatory framework for digital assets.
SECTION 4. Failure to comply with these regulations will result in penalties, including fines and suspension of operations.
SECTION 5. This act will take effect 180 days after its passage.
`
      },
      { 
        id: 'item_3_2', 
        title: 'A Bill to Increase the Federal Minimum Wage to $20/hour',
        fullText: `
BE IT ENACTED BY THIS STUDENT CONGRESS:
SECTION 1. The federal minimum wage, as stipulated by the Fair Labor Standards Act, shall be increased to $20.00 per hour.
SECTION 2. This increase will be phased in over a period of four years, with an initial increase to $14.00, followed by annual increases of $2.00 until the $20.00 target is met.
SECTION 3. After reaching $20.00, the minimum wage shall be indexed to the Consumer Price Index for Urban Wage Earners and Clerical Workers (CPI-W) and adjusted annually.
SECTION 4. The Department of Labor will oversee the implementation and enforcement of this wage increase.
SECTION 5. The first increase shall take effect on the first day of the year following the passage of this bill.
`
      },
      { 
        id: 'item_3_3', 
        title: 'A Resolution to Withdraw from the World Trade Organization',
        fullText: `
WHEREAS, the dispute settlement mechanism of the World Trade Organization (WTO) has been criticized for undermining United States sovereignty; and
WHEREAS, globalization and free trade agreements have led to the outsourcing of American jobs and the decline of domestic manufacturing; and
WHEREAS, bilateral trade agreements offer a more direct and effective means of protecting American economic interests;
RESOLVED, That this Student Congress recommends that the United States formally withdraw from the World Trade Organization and pursue a strategy of bilateral trade negotiations.
`
      },
    ]
  }
];
