import { describe, it, expect } from 'vitest';
import {
  calculateMalaysia,
  calculateEpf,
  calculateSocso,
  calculateEis,
  calculateHrdf,
  calculatePcb,
  type MyEmployeeContext,
} from '../services/statutory/my.js';
import {
  calculateSingapore,
  calculateCpf,
  calculateSdl,
  calculateFwl,
  ageOnFirstOfMonth,
  type SgEmployeeContext,
} from '../services/statutory/sg.js';

const myCitizen: MyEmployeeContext = {
  nationality: 'malaysian',
  ageGroup: 'below_60',
  pcbCategory: 'KA1',
  hrdfEligible: true,
};

const myForeign: MyEmployeeContext = {
  nationality: 'foreign',
  ageGroup: 'below_60',
  pcbCategory: 'KA1',
  hrdfEligible: true,
};

const mySenior: MyEmployeeContext = {
  nationality: 'malaysian',
  ageGroup: 'above_60',
  pcbCategory: 'KA1',
  hrdfEligible: true,
};

describe('MY EPF', () => {
  it('Malaysian under 60 on RM 5,000: 11% EE / 13% ER', () => {
    const r = calculateEpf(5000, myCitizen);
    expect(r.ee).toBe(550);
    expect(r.er).toBe(650);
  });

  it('Malaysian under 60 above RM 5,000: ER drops to 12%', () => {
    const r = calculateEpf(8000, myCitizen);
    expect(r.ee).toBe(880);
    expect(r.er).toBe(960);
  });

  it('Foreign worker (post-Oct 2025): 2% / 2%', () => {
    const r = calculateEpf(5000, myForeign);
    expect(r.ee).toBe(100);
    expect(r.er).toBe(100);
  });

  it('Aged 60+: EE 0%, ER 4%', () => {
    const r = calculateEpf(5000, mySenior);
    expect(r.ee).toBe(0);
    expect(r.er).toBe(200);
  });
});

describe('MY SOCSO', () => {
  it('Cat 1 below cap: 0.5% EE / 1.75% ER', () => {
    const r = calculateSocso(4000, myCitizen);
    expect(r.ee).toBe(20);
    expect(r.er).toBe(70);
  });

  it('Capped at RM 6,000 wage', () => {
    const r = calculateSocso(10000, myCitizen);
    expect(r.ee).toBe(30);  // 6000 * 0.005
    expect(r.er).toBe(105); // 6000 * 0.0175
  });

  it('Foreign worker → Cat 2 (ER 1.25% only)', () => {
    const r = calculateSocso(4000, myForeign);
    expect(r.ee).toBe(0);
    expect(r.er).toBe(50); // 4000 * 0.0125
  });
});

describe('MY EIS', () => {
  it('Citizen under 60: 0.2% / 0.2%', () => {
    const r = calculateEis(4000, myCitizen);
    expect(r.ee).toBe(8);
    expect(r.er).toBe(8);
  });

  it('Foreign worker: 0 / 0', () => {
    const r = calculateEis(4000, myForeign);
    expect(r.ee).toBe(0);
    expect(r.er).toBe(0);
  });

  it('Above 60: 0 / 0', () => {
    const r = calculateEis(4000, mySenior);
    expect(r.ee).toBe(0);
    expect(r.er).toBe(0);
  });
});

describe('MY HRDF', () => {
  it('Eligible employer: 1% ER on Malaysian', () => {
    expect(calculateHrdf(5000, myCitizen)).toBe(50);
  });

  it('Foreign worker: not levy-bearing', () => {
    expect(calculateHrdf(5000, myForeign)).toBe(0);
  });

  it('Non-eligible employer: 0', () => {
    expect(calculateHrdf(5000, { ...myCitizen, hrdfEligible: false })).toBe(0);
  });
});

describe('MY PCB', () => {
  it('Below personal relief → 0 PCB', () => {
    // 1100/mo = 13200/yr, less ~1452 EPF relief (121*12), less 9000 KA1 = 2748
    // chargeable. 2748 sits in the 0% bracket (≤RM5,000) → no tax owed.
    const r = calculatePcb(1100, myCitizen, 121);
    expect(r).toBe(0);
  });

  it('Foreign non-resident: flat 30%', () => {
    const r = calculatePcb(5000, myForeign, 100);
    expect(r).toBe(1500);
  });

  it('KA2 has higher relief than KA1', () => {
    const ka1 = calculatePcb(8000, myCitizen, 880);
    const ka2 = calculatePcb(8000, { ...myCitizen, pcbCategory: 'KA2' }, 880);
    expect(ka2).toBeLessThan(ka1);
  });
});

describe('MY orchestrator', () => {
  it('Composes all schemes for a Malaysian @ RM 5,000', () => {
    const r = calculateMalaysia(5000, myCitizen);
    expect(r.epfEmployee).toBe(550);
    expect(r.socsoEmployee).toBe(25);
    expect(r.eisEmployee).toBe(10);
    expect(r.hrdfEmployer).toBe(50);
    // Employer cost = 5000 + 650 (EPF) + 87.5 (SOCSO) + 10 (EIS) + 50 (HRDF)
    expect(r.totalEmployerCost).toBeCloseTo(5797.5, 1);
  });
});

// ---------------------------------------------------------------------------
// Singapore
// ---------------------------------------------------------------------------

const sgCitizen30: SgEmployeeContext = {
  nationality: 'citizen',
  ageOnFirstOfMonth: 30,
  workPass: 'none',
  ytdOrdinaryWages: 0,
  ytdAdditionalWages: 0,
};

describe('SG CPF', () => {
  it('Citizen ≤55 on S$5,000 OW: 20% EE / 17% ER', () => {
    const r = calculateCpf({ ordinaryWage: 5000, additionalWage: 0 }, sgCitizen30);
    expect(r.ee).toBe(1000);
    expect(r.er).toBe(850);
  });

  it('OW above S$8,000 ceiling capped at S$8,000', () => {
    const r = calculateCpf({ ordinaryWage: 12000, additionalWage: 0 }, sgCitizen30);
    expect(r.owSubjected).toBe(8000);
    expect(r.ee).toBe(1600); // 8000 * 0.20
    expect(r.er).toBe(1360); // 8000 * 0.17
  });

  it('Age band 60–65: 11.5% EE / 12% ER', () => {
    const r = calculateCpf(
      { ordinaryWage: 5000, additionalWage: 0 },
      { ...sgCitizen30, ageOnFirstOfMonth: 62 },
    );
    expect(r.ee).toBe(575);
    expect(r.er).toBe(600);
  });

  it('Foreign EP holder: zero CPF', () => {
    const r = calculateCpf(
      { ordinaryWage: 5000, additionalWage: 0 },
      { ...sgCitizen30, nationality: 'foreign' },
    );
    expect(r.ee).toBe(0);
    expect(r.er).toBe(0);
  });

  it('AW ceiling enforces $102K rolling cap', () => {
    // 11 months of $8K subjected OW = $88K, AW ceiling remaining = $14K
    const r = calculateCpf(
      { ordinaryWage: 8000, additionalWage: 30000 }, // huge bonus
      { ...sgCitizen30, ytdOrdinaryWages: 88000, ytdAdditionalWages: 0 },
    );
    // Total subjected = 8000 OW + 6000 AW (102000 - 96000 = 6000)
    expect(r.awSubjected).toBe(6000);
  });

  it('PR first 2 years: graduated rate (5% EE / 4% ER)', () => {
    const r = calculateCpf(
      { ordinaryWage: 5000, additionalWage: 0 },
      { ...sgCitizen30, nationality: 'pr_first2' },
    );
    expect(r.ee).toBe(250);
    expect(r.er).toBe(200);
  });
});

describe('SG SDL', () => {
  it('Below cap: 0.25%', () => {
    expect(calculateSdl(2000)).toBe(5);
  });

  it('Above S$4,500 capped at S$11.25', () => {
    expect(calculateSdl(8000)).toBe(11.25);
  });

  it('Min S$2', () => {
    expect(calculateSdl(500)).toBe(2);
  });
});

describe('SG FWL', () => {
  it('S Pass: S$330', () => {
    expect(calculateFwl('s_pass')).toBe(330);
  });
  it('Work Permit: S$300', () => {
    expect(calculateFwl('work_permit')).toBe(300);
  });
  it('EP / citizen / PR: 0', () => {
    expect(calculateFwl('employment_pass')).toBe(0);
    expect(calculateFwl('none')).toBe(0);
  });
});

describe('SG age helper', () => {
  it('Computes age before birthday', () => {
    expect(ageOnFirstOfMonth('1970-12-15', '2026-04-01')).toBe(55);
  });
  it('Computes age after birthday', () => {
    expect(ageOnFirstOfMonth('1970-01-15', '2026-04-01')).toBe(56);
  });
});

describe('SG orchestrator', () => {
  it('Composes CPF + SDL for citizen', () => {
    const r = calculateSingapore(
      { ordinaryWage: 5000, additionalWage: 0 },
      sgCitizen30,
    );
    expect(r.cpfEmployee).toBe(1000);
    expect(r.cpfEmployer).toBe(850);
    expect(r.sdlEmployer).toBe(11.25);
    expect(r.fwlEmployer).toBe(0);
  });

  it('Foreign Work Permit: SDL + FWL only, zero CPF', () => {
    const r = calculateSingapore(
      { ordinaryWage: 2000, additionalWage: 0 },
      { ...sgCitizen30, nationality: 'foreign', workPass: 'work_permit' },
    );
    expect(r.cpfEmployee).toBe(0);
    expect(r.fwlEmployer).toBe(300);
    expect(r.totalEmployerCost).toBe(2000 + 5 + 300);
  });
});
