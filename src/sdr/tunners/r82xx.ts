import { Device, div } from "../device";


const R820T_I2C_ADDR = 0x34;
const R828D_I2C_ADDR = 0x74;
const R828D_XTAL_FREQ = 16000000;

const R82XX_CHECK_ADDR = 0x00;
const R82XX_CHECK_VAL = 0x69;

const R82XX_IF_FREQ = 3570000;

const REG_SHADOW_START = 5;
const NUM_REGS = 30;
const NUM_IMR = 5;
const IMR_TRIAL = 9;

const VER_NUM = 49;


const MHZ = 1000*1000;
const KHZ = 1000;

const enum r82xx_chip {
	CHIP_R820T,
	CHIP_R620D,
	CHIP_R828D,
	CHIP_R828,
	CHIP_R828S,
	CHIP_R820C,
};

const enum r82xx_tuner_type {
	TUNER_RADIO = 1,
	TUNER_ANALOG_TV,
	TUNER_DIGITAL_TV
};

const enum r82xx_xtal_cap_value {
	XTAL_LOW_CAP_30P = 0,
	XTAL_LOW_CAP_20P,
	XTAL_LOW_CAP_10P,
	XTAL_LOW_CAP_0P,
	XTAL_HIGH_CAP_0P
};

// struct r82xx_config {
// 	uint8_t i2c_addr;
// 	uint32_t xtal;
// 	enum r82xx_chip rafael_chip;
// 	unsigned int max_i2c_msg_len;
// 	int use_predetect;
// };

// struct r82xx_priv {
// 	struct r82xx_config		*cfg;

// 	uint8_t				regs[NUM_REGS];
// 	uint8_t				buf[NUM_REGS + 1];
// 	enum r82xx_xtal_cap_value	xtal_cap_sel;
// 	uint16_t			pll;	/* kHz */
// 	uint32_t			int_freq;
// 	uint8_t				fil_cal_code;
// 	uint8_t				input;
// 	int				has_lock;
// 	int				init_done;

// 	/* Store current mode */
// 	uint32_t			delsys;
// 	enum r82xx_tuner_type		type;

// 	uint32_t			bw;	/* in MHz */

// 	void *rtl_dev;
// };

// struct r82xx_freq_range {
// 	uint32_t	freq;
// 	uint8_t		open_d;
// 	uint8_t		rf_mux_ploy;
// 	uint8_t		tf_c;
// 	uint8_t		xtal_cap20p;
// 	uint8_t		xtal_cap10p;
// 	uint8_t		xtal_cap0p;
// };

const enum r82xx_delivery_system {
	SYS_UNDEFINED,
	SYS_DVBT,
	SYS_DVBT2,
	SYS_ISDBT,
};

const r82xx_init_array = new Uint8Array([
	0x83, 0x32, 0x75,			/* 05 to 07 */
	0xc0, 0x40, 0xd6, 0x6c,			/* 08 to 0b */
	0xf5, 0x63, 0x75, 0x68,			/* 0c to 0f */
	0x6c, 0x83, 0x80, 0x00,			/* 10 to 13 */
	0x0f, 0x00, 0xc0, 0x30,			/* 14 to 17 */
	0x48, 0xcc, 0x60, 0x00,			/* 18 to 1b */
  0x54, 0xae, 0x4a, 0xc0,     /* 1c to 1f */
  0x00, 0x00, 0x00,			      /* padding to 30 */
]);

const VGA_BASE_GAIN	= -47;

const r82xx_vga_gain_steps = [
  0, 26, 26, 30, 42, 35, 24, 13, 14, 32, 36, 34, 35, 37, 35, 36
];

const r82xx_lna_gain_steps = [
	0, 9, 13, 40, 38, 13, 31, 22, 26, 31, 26, 14, 19, 5, 35, 13
];

const r82xx_mixer_gain_steps = [
	0, 5, 10, 10, 19, 9, 10, 25, 17, 10, 8, 16, 13, 6, 3, -8
];


const r82xx_if_low_pass_bw_table = [
  1700000, 1600000, 1550000, 1450000, 1200000, 900000, 700000, 550000, 450000, 350000
];

const FILT_HP_BW1 = 350000;
const FILT_HP_BW2 = 380000;


/* Tuner frequency ranges */
const freq_ranges= [
	{
	freq:		0,	/* Start freq, in MHz */
	open_d:		0x08,	/* low */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0xdf,	/* R27[7:0]  band2,band0 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		50,	/* Start freq, in MHz */
	open_d:		0x08,	/* low */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0xbe,	/* R27[7:0]  band4,band1  */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		55,	/* Start freq, in MHz */
	open_d:		0x08,	/* low */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x8b,	/* R27[7:0]  band7,band4 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		60,	/* Start freq, in MHz */
	open_d:		0x08,	/* low */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x7b,	/* R27[7:0]  band8,band4 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		65,	/* Start freq, in MHz */
	open_d:		0x08,	/* low */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x69,	/* R27[7:0]  band9,band6 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		70,	/* Start freq, in MHz */
	open_d:		0x08,	/* low */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x58,	/* R27[7:0]  band10,band7 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		75,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x44,	/* R27[7:0]  band11,band11 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		80,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x44,	/* R27[7:0]  band11,band11 */
	xtal_cap20p:	0x02,	/* R16[1:0]  20pF (10)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		90,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x34,	/* R27[7:0]  band12,band11 */
	xtal_cap20p:	0x01,	/* R16[1:0]  10pF (01)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		100,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x34,	/* R27[7:0]  band12,band11 */
	xtal_cap20p:	0x01,	/* R16[1:0]  10pF (01)    */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		110,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x24,	/* R27[7:0]  band13,band11 */
	xtal_cap20p:	0x01,	/* R16[1:0]  10pF (01)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		120,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x24,	/* R27[7:0]  band13,band11 */
	xtal_cap20p:	0x01,	/* R16[1:0]  10pF (01)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		140,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x14,	/* R27[7:0]  band14,band11 */
	xtal_cap20p:	0x01,	/* R16[1:0]  10pF (01)   */
	xtal_cap10p:	0x01,
	xtal_cap0p:	0x00,
	}, {
	freq:		180,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x13,	/* R27[7:0]  band14,band12 */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
	freq:		220,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x13,	/* R27[7:0]  band14,band12 */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
	freq:		250,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x11,	/* R27[7:0]  highest,highest */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
	freq:		280,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x02,	/* R26[7:6]=0 (LPF)  R26[1:0]=2 (low) */
	tf_c:		0x00,	/* R27[7:0]  highest,highest */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
	freq:		310,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x41,	/* R26[7:6]=1 (bypass)  R26[1:0]=1 (middle) */
	tf_c:		0x00,	/* R27[7:0]  highest,highest */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
	freq:		450,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x41,	/* R26[7:6]=1 (bypass)  R26[1:0]=1 (middle) */
	tf_c:		0x00,	/* R27[7:0]  highest,highest */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
	freq:		588,	/* Start freq, in MHz */
	open_d:		0x00,	/* high */
	rf_mux_ploy:	0x40,	/* R26[7:6]=1 (bypass)  R26[1:0]=0 (highest) */
	tf_c:		0x00,	/* R27[7:0]  highest,highest */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap10p:	0x00,
	xtal_cap0p:	0x00,
	}, {
    freq: 650,	/* Start freq, in MHz */
    open_d:0x00,	/* high */
	rf_mux_ploy:	0x40,	/* R26[7:6]=1 (bypass)  R26[1:0]=0 (highest) */
	tf_c:		0x00,	/* R27[7:0]  highest,highest */
	xtal_cap20p:	0x00,	/* R16[1:0]  0pF (00)   */
	xtal_cap0p:	0x00,
	xtal_cap10p:	0x00,
	}
];

export interface TunnerCtx {
  init(): Promise<void>;
  set_auto_gain();
  set_gain(gain: number);
  set_freq(freq: number);
  set_bw(bw: number);
}


export class TunnerR82xx implements TunnerCtx {
  i2c_addr = R820T_I2C_ADDR;
  rafael_chip = r82xx_chip.CHIP_R820T;
  max_i2c_msg_len = 8;
  use_predetect: boolean = false;
  cfg;
  xtal_cap_sel = r82xx_xtal_cap_value.XTAL_HIGH_CAP_0P;
  init_done = false;
  xtal = 0;
  int_freq = 0;
  regs: Uint8Array = new Uint8Array(NUM_REGS);
  has_lock: boolean = false;
  delsys = 0;
  type = 0;
  bw = 0;
  input = 0;
  fil_cal_code = 0;

  constructor(private dev: Device) {}

  async init() {
    this.xtal = this.dev.get_xtal_tun_freq();

    /* Initialize registers */
    await this.r82xx_write(0x05, r82xx_init_array);

    await this.r82xx_set_tv_standard(3, r82xx_tuner_type.TUNER_DIGITAL_TV, 0);

    await this.r82xx_sysfreq_sel(0, r82xx_tuner_type.TUNER_DIGITAL_TV, r82xx_delivery_system.SYS_DVBT);

    this.init_done = true;
  }

  r820t_exit() {
    // rtlsdr_dev_t* devt = (rtlsdr_dev_t*)dev;
    // return r82xx_standby(&devt->r82xx_p);
  }

  async set_freq(freq: number) {
    const lo_freq = freq + this.int_freq;

    await this.r82xx_set_mux(lo_freq);

    const locked = await this.r82xx_set_pll(lo_freq);
    if (!locked) {
      throw new Error('set_freq failed, because PLL not locked');
    }

    /* switch between 'Cable1' and 'Air-In' inputs on sticks with
    * R828D tuner. We switch at 345 MHz, because that's where the
    * noise-floor has about the same level with identical LNA
    * settings. The original driver used 320 MHz. */
    const air_cable1_in = (freq > (345 * MHZ)) ? 0x00 : 0x60;

    if ((this.rafael_chip === r82xx_chip.CHIP_R828D) && (air_cable1_in !== this.input)) {

      this.input = air_cable1_in;
      await this.r82xx_write_reg_mask(0x05, air_cable1_in, 0x60);
    }
  }

  async set_bw(bw: number) {
    const ifreq = await this.r82xx_set_bandwidth(bw);
    await this.dev.set_if_freq(ifreq);
    return this.dev.setCentralFreq(this.dev.freq);
  }

  set_gain(gain: number) {
    return this.r82xx_set_gain(true, gain);
  }

  set_auto_gain() {
    return this.r82xx_set_gain(false, 0);
  }

  async r82xx_set_mux(freq: number) {
    /* Get the proper frequency range */
    freq = div(freq, 1000000);
    let i = 0;
    for (i = 0; i < freq_ranges.length - 1; i++) {
      if (freq < freq_ranges[i + 1].freq) {
        break;
      }
    }
    let range = freq_ranges[i];

    /* Open Drain */
    await this.r82xx_write_reg_mask(0x17, range.open_d, 0x08);

    /* RF_MUX,Polymux */
    await this.r82xx_write_reg_mask(0x1a, range.rf_mux_ploy, 0xc3);

    /* TF BAND */
    await this.r82xx_write(0x1b, [range.tf_c]);

    /* XTAL CAP & Drive */
    let val;
    switch (this.xtal_cap_sel) {
    case r82xx_xtal_cap_value.XTAL_LOW_CAP_30P:
    case r82xx_xtal_cap_value.XTAL_LOW_CAP_20P:
      val = range.xtal_cap20p | 0x08;
      break;
    case r82xx_xtal_cap_value.XTAL_LOW_CAP_10P:
      val = range.xtal_cap10p | 0x08;
      break;
    case r82xx_xtal_cap_value.XTAL_HIGH_CAP_0P:
      val = range.xtal_cap0p | 0x00;
      break;
    default:
    case r82xx_xtal_cap_value.XTAL_LOW_CAP_0P:
      val = range.xtal_cap0p | 0x08;
      break;
    }
    await this.r82xx_write_reg_mask(0x10, val, 0x0b);
    await this.r82xx_write_reg_mask(0x08, 0x00, 0x3f);
    await this.r82xx_write_reg_mask(0x09, 0x00, 0x3f);
  }


  async r82xx_set_bandwidth(bw: number) {
    let real_bw = 0;
    let reg_0a: number;
    let reg_0b: number;

    if (bw > 7000000) {
      // BW: 8 MHz
      reg_0a = 0x10;
      reg_0b = 0x0b;
      this.int_freq = 4570000;
    } else if (bw > 6000000) {
      // BW: 7 MHz
      reg_0a = 0x10;
      reg_0b = 0x2a;
      this.int_freq = 4570000;
    } else if (bw > r82xx_if_low_pass_bw_table[0] + FILT_HP_BW1 + FILT_HP_BW2) {
      // BW: 6 MHz
      reg_0a = 0x10;
      reg_0b = 0x6b;
      this.int_freq = 3570000;
    } else {
      reg_0a = 0x00;
      reg_0b = 0x80;
      this.int_freq = 2300000;

      if (bw > r82xx_if_low_pass_bw_table[0] + FILT_HP_BW1) {
        bw -= FILT_HP_BW2;
        this.int_freq += FILT_HP_BW2;
        real_bw += FILT_HP_BW2;
      } else {
        reg_0b |= 0x20;
      }

      if (bw > r82xx_if_low_pass_bw_table[0]) {
        bw -= FILT_HP_BW1;
        this.int_freq += FILT_HP_BW1;
        real_bw += FILT_HP_BW1;
      } else {
        reg_0b |= 0x40;
      }

      // find low-pass filter
      let i = 0;
      for(; i < r82xx_if_low_pass_bw_table.length; ++i) {
        if (bw > r82xx_if_low_pass_bw_table[i]) {
          break;
        }
      }
      --i;
      reg_0b |= 15 - i;
      real_bw += r82xx_if_low_pass_bw_table[i];

      this.int_freq -= div(real_bw, 2);
    }

    await this.r82xx_write_reg_mask(0x0a, reg_0a, 0x10);

    await this.r82xx_write_reg_mask(0x0b, reg_0b, 0xef);

    return this.int_freq;
  }



  async r82xx_set_gain(set_manual_gain: boolean, gain: number) {

    if (set_manual_gain) {
      /* LNA auto off */
      await this.r82xx_write_reg_mask(0x05, 0x10, 0x10);

       /* Mixer auto off */
      await this.r82xx_write_reg_mask(0x07, 0, 0x10);

      await this.r82xx_read(0x00, 4);

      /* set fixed VGA gain for now (16.3 dB) */
      await this.r82xx_write_reg_mask(0x0c, 0x08, 0x9f);

      let total_gain = 0;
      let mix_index = 0;
      let lna_index = 0;
      for (let i = 0; i < 15; i++) {
        if (total_gain >= gain) {
          break;
        }

        total_gain += r82xx_lna_gain_steps[++lna_index];

        if (total_gain >= gain) {
          break;
        }

        total_gain += r82xx_mixer_gain_steps[++mix_index];
      }

      /* set LNA gain */
      await this.r82xx_write_reg_mask(0x05, lna_index, 0x0f);

      /* set Mixer gain */
      await this.r82xx_write_reg_mask(0x07, mix_index, 0x0f);

    } else {
      /* LNA */
      await this.r82xx_write_reg_mask(0x05, 0, 0x10);

      /* Mixer */
      await this.r82xx_write_reg_mask(0x07, 0x10, 0x10);

      /* set fixed VGA gain for now (26.5 dB) */
      await this.r82xx_write_reg_mask(0x0c, 0x0b, 0x9f);
    }
  }


  r82xx_read_cache_reg(reg: number): number {
    reg -= REG_SHADOW_START;

    if (reg >= 0 && reg < NUM_REGS) {
      return this.regs[reg];
    } else {
      throw new Error('failed reading from r82xx cache');
    }
  }

  async r82xx_read(reg: number, len: number): Promise<Uint8Array> {
    const data = await this.dev.read_i2c_array(this.i2c_addr, reg, len);

    /* Copy data to the output buffer */
    const output = new Uint8Array(data.byteLength);
    for (let i = 0; i < data.byteLength; i++) {
      output[i] = r82xx_bitrev(data.getUint8(i));
    }
    return output;
  }



  r82xx_write_reg_mask(reg: number, val: number, bit_mask: number) {
    const rc = this.r82xx_read_cache_reg(reg);
    val = (rc & ~bit_mask) | (val & bit_mask);
    return this.r82xx_write(reg, [val]);
  }


  async r82xx_write(reg: number, data: number[] | Uint8Array) {
    let pos = 0;
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
    let len = buffer.byteLength;
    // /* Store the shadow registers */
    this.shadow_store(reg, buffer);

    do {
      const size = Math.min(len, this.max_i2c_msg_len - 1);
      await this.dev.write_i2c_array(this.i2c_addr, reg, buffer.subarray(pos, pos+size));

      reg += size;
      len -= size;
      pos += size;
    } while (len > 0);
  }

  shadow_store(reg, val: Uint8Array) {
    let r = reg - REG_SHADOW_START;
    let len = val.byteLength;
    if (r < 0) {
      len += r;
      r = 0;
    }
    if (len <= 0) {
      return;
    }
    if (len > NUM_REGS - r) {
      len = NUM_REGS - r;
    }
    this.regs.set(val, r);
  }

  async r82xx_sysfreq_sel(freq: number, type: r82xx_tuner_type, delsys: number) {
    let mixer_top, lna_top, cp_cur, div_buf_cur, lna_vth_l, mixer_vth_l;
    let air_cable1_in, cable2_in, pre_dect, lna_discharge, filter_cur;

    switch (delsys) {
    case r82xx_delivery_system.SYS_DVBT:
      if ((freq == 506000000) || (freq == 666000000) || (freq == 818000000)) {
        mixer_top = 0x14;	/* mixer top:14 , top-1, low-discharge */
        lna_top = 0xe5;		/* detect bw 3, lna top:4, predet top:2 */
        cp_cur = 0x28;		/* 101, 0.2 */
        div_buf_cur = 0x20;	/* 10, 200u */
      } else {
        mixer_top = 0x24;	/* mixer top:13 , top-1, low-discharge */
        lna_top = 0xe5;		/* detect bw 3, lna top:4, predet top:2 */
        cp_cur = 0x38;		/* 111, auto */
        div_buf_cur = 0x30;	/* 11, 150u */
      }
      lna_vth_l = 0x53;		/* lna vth 0.84	,  vtl 0.64 */
      mixer_vth_l = 0x75;		/* mixer vth 1.04, vtl 0.84 */
      air_cable1_in = 0x00;
      cable2_in = 0x00;
      pre_dect = 0x40;
      lna_discharge = 14;
      filter_cur = 0x40;		/* 10, low */
      break;
    case r82xx_delivery_system.SYS_DVBT2:
      mixer_top = 0x24;	/* mixer top:13 , top-1, low-discharge */
      lna_top = 0xe5;		/* detect bw 3, lna top:4, predet top:2 */
      lna_vth_l = 0x53;	/* lna vth 0.84	,  vtl 0.64 */
      mixer_vth_l = 0x75;	/* mixer vth 1.04, vtl 0.84 */
      air_cable1_in = 0x00;
      cable2_in = 0x00;
      pre_dect = 0x40;
      lna_discharge = 14;
      cp_cur = 0x38;		/* 111, auto */
      div_buf_cur = 0x30;	/* 11, 150u */
      filter_cur = 0x40;	/* 10, low */
      break;
    case r82xx_delivery_system.SYS_ISDBT:
      mixer_top = 0x24;	/* mixer top:13 , top-1, low-discharge */
      lna_top = 0xe5;		/* detect bw 3, lna top:4, predet top:2 */
      lna_vth_l = 0x75;	/* lna vth 1.04	,  vtl 0.84 */
      mixer_vth_l = 0x75;	/* mixer vth 1.04, vtl 0.84 */
      air_cable1_in = 0x00;
      cable2_in = 0x00;
      pre_dect = 0x40;
      lna_discharge = 14;
      cp_cur = 0x38;		/* 111, auto */
      div_buf_cur = 0x30;	/* 11, 150u */
      filter_cur = 0x40;	/* 10, low */
      break;
    default: /* DVB-T 8M */
      mixer_top = 0x24;	/* mixer top:13 , top-1, low-discharge */
      lna_top = 0xe5;		/* detect bw 3, lna top:4, predet top:2 */
      lna_vth_l = 0x53;	/* lna vth 0.84	,  vtl 0.64 */
      mixer_vth_l = 0x75;	/* mixer vth 1.04, vtl 0.84 */
      air_cable1_in = 0x00;
      cable2_in = 0x00;
      pre_dect = 0x40;
      lna_discharge = 14;
      cp_cur = 0x38;		/* 111, auto */
      div_buf_cur = 0x30;	/* 11, 150u */
      filter_cur = 0x40;	/* 10, low */
      break;
    }

    if (this.use_predetect) {
      await this.r82xx_write_reg_mask(0x06, pre_dect, 0x40);
    }

    await this.r82xx_write_reg_mask(0x1d, lna_top, 0xc7);

    await this.r82xx_write_reg_mask(0x1c, mixer_top, 0xf8);

    await this.r82xx_write(0x0d, [lna_vth_l]);

    await this.r82xx_write(0x0e, [mixer_vth_l]);

    this.input = air_cable1_in;

    /* Air-IN only for Astrometa */
    await this.r82xx_write_reg_mask(0x05, air_cable1_in, 0x60);

    await this.r82xx_write_reg_mask(0x06, cable2_in, 0x08);


    await this.r82xx_write_reg_mask(0x11, cp_cur, 0x38);

    await this.r82xx_write_reg_mask(0x17, div_buf_cur, 0x30);

    await this.r82xx_write_reg_mask(0x0a, filter_cur, 0x60);


    /*
    * Set LNA
    */

    if (type !== r82xx_tuner_type.TUNER_ANALOG_TV) {
      /* LNA TOP: lowest */
      await this.r82xx_write_reg_mask(0x1d, 0, 0x38);

      /* 0: normal mode */
      await this.r82xx_write_reg_mask(0x1c, 0, 0x04);

      /* 0: PRE_DECT off */
      await this.r82xx_write_reg_mask(0x06, 0, 0x40);


      /* agc clk 250hz */
      await this.r82xx_write_reg_mask(0x1a, 0x30, 0x30);

      //		msleep(250);

      /* write LNA TOP = 3 */
      await this.r82xx_write_reg_mask(0x1d, 0x18, 0x38);

      /*
      * write discharge mode
      * FIXME: IMHO, the mask here is wrong, but it matches
      * what's there at the original driver
      */
      await this.r82xx_write_reg_mask(0x1c, mixer_top, 0x04);

      /* LNA discharge current */
      await this.r82xx_write_reg_mask(0x1e, lna_discharge, 0x1f);

      /* agc clk 60hz */
      await this.r82xx_write_reg_mask(0x1a, 0x20, 0x30);

    } else {
      /* PRE_DECT off */
      await this.r82xx_write_reg_mask(0x06, 0, 0x40);

      /* write LNA TOP */
      await this.r82xx_write_reg_mask(0x1d, lna_top, 0x38);

      /*
      * write discharge mode
      * FIXME: IMHO, the mask here is wrong, but it matches
      * what's there at the original driver
      */
      await this.r82xx_write_reg_mask(0x1c, mixer_top, 0x04);

      /* LNA discharge current */
      await this.r82xx_write_reg_mask(0x1e, lna_discharge, 0x1f);

      /* agc clk 1Khz, external det1 cap 1u */
      await this.r82xx_write_reg_mask(0x1a, 0x00, 0x30);

      await this.r82xx_write_reg_mask(0x10, 0x00, 0x04);
    }
  }

  async r82xx_set_tv_standard(bw: number, type: r82xx_tuner_type, delsys: number) {
    let if_khz, filt_cal_lo;
    let filt_gain, img_r, filt_q, hp_cor, ext_enable, loop_through;
    let lt_att, flt_ext_widest, polyfil_cur;

    if (delsys == r82xx_delivery_system.SYS_ISDBT) {
      if_khz = 4063;
      filt_cal_lo = 59000;
      filt_gain = 0x10;	/* +3db, 6mhz on */
      img_r = 0x00;		/* image negative */
      filt_q = 0x10;		/* r10[4]:low q(1'b1) */
      hp_cor = 0x6a;		/* 1.7m disable, +2cap, 1.25mhz */
      ext_enable = 0x40;	/* r30[6], ext enable; r30[5]:0 ext at lna max */
      loop_through = 0x00;	/* r5[7], lt on */
      lt_att = 0x00;		/* r31[7], lt att enable */
      flt_ext_widest = 0x00;	/* r15[7]: flt_ext_wide off */
      polyfil_cur = 0x60;	/* r25[6:5]:min */
    } else {

      if (bw <= 6) {
        if_khz = 3570;
        filt_cal_lo = 56000;	/* 52000->56000 */
        filt_gain = 0x10;	/* +3db, 6mhz on */
        img_r = 0x00;		/* image negative */
        filt_q = 0x10;		/* r10[4]:low q(1'b1) */
        hp_cor = 0x6b;		/* 1.7m disable, +2cap, 1.0mhz */
        ext_enable = 0x60;	/* r30[6]=1 ext enable; r30[5]:1 ext at lna max-1 */
        loop_through = 0x00;	/* r5[7], lt on */
        lt_att = 0x00;		/* r31[7], lt att enable */
        flt_ext_widest = 0x00;	/* r15[7]: flt_ext_wide off */
        polyfil_cur = 0x60;	/* r25[6:5]:min */
      } else if (bw == 7) {
        /* 7 MHz, second table */
        if_khz = 4570;
        filt_cal_lo = 63000;
        filt_gain = 0x10;	/* +3db, 6mhz on */
        img_r = 0x00;		/* image negative */
        filt_q = 0x10;		/* r10[4]:low q(1'b1) */
        hp_cor = 0x2a;		/* 1.7m disable, +1cap, 1.25mhz */
        ext_enable = 0x60;	/* r30[6]=1 ext enable; r30[5]:1 ext at lna max-1 */
        loop_through = 0x00;	/* r5[7], lt on */
        lt_att = 0x00;		/* r31[7], lt att enable */
        flt_ext_widest = 0x00;	/* r15[7]: flt_ext_wide off */
        polyfil_cur = 0x60;	/* r25[6:5]:min */
      } else {
        if_khz = 4570;
        filt_cal_lo = 68500;
        filt_gain = 0x10;	/* +3db, 6mhz on */
        img_r = 0x00;		/* image negative */
        filt_q = 0x10;		/* r10[4]:low q(1'b1) */
        hp_cor = 0x0b;		/* 1.7m disable, +0cap, 1.0mhz */
        ext_enable = 0x60;	/* r30[6]=1 ext enable; r30[5]:1 ext at lna max-1 */
        loop_through = 0x00;	/* r5[7], lt on */
        lt_att = 0x00;		/* r31[7], lt att enable */
        flt_ext_widest = 0x00;	/* r15[7]: flt_ext_wide off */
        polyfil_cur = 0x60;	/* r25[6:5]:min */
      }
    }

    /* Initialize the shadow registers */
    this.regs.set(r82xx_init_array);

    /* Init Flag & Xtal_check Result (inits VGA gain, needed?)*/
    await this.r82xx_write_reg_mask(0x0c, 0x00, 0x0f);

    /* version */
    await this.r82xx_write_reg_mask(0x13, VER_NUM, 0x3f);

    /* for LT Gain test */
    if (type !== r82xx_tuner_type.TUNER_ANALOG_TV) {
      await this.r82xx_write_reg_mask(0x1d, 0x00, 0x38);
    //		usleep_range(1000, 2000);
    }
    this.int_freq = if_khz * 1000;

    /* Check if standard changed. If so, filter calibration is needed */
    /* as we call this function only once in rtlsdr, force calibration */
    const need_calibration = true;

    if (need_calibration) {
      for (let i = 0; i < 2; i++) {
        /* Set filt_cap */
        await this.r82xx_write_reg_mask(0x0b, hp_cor, 0x60);

        /* set cali clk =on */
        await this.r82xx_write_reg_mask(0x0f, 0x04, 0x04);

        /* X'tal cap 0pF for PLL */
        await this.r82xx_write_reg_mask(0x10, 0x00, 0x03);

        const locked = await this.r82xx_set_pll(filt_cal_lo * 1000);
        if (!locked) {
          return;
        }

        /* Start Trigger */
        await this.r82xx_write_reg_mask(0x0b, 0x10, 0x10);

        //			usleep_range(1000, 2000);

        /* Stop Trigger */
        await this.r82xx_write_reg_mask(0x0b, 0x00, 0x10);

        /* set cali clk =off */
        await this.r82xx_write_reg_mask(0x0f, 0x00, 0x04);

        /* Check if calibration worked */
        const data = await this.r82xx_read(0x00, 5);

        this.fil_cal_code = data[4] & 0x0f;
        if (this.fil_cal_code && this.fil_cal_code !== 0x0f) {
          break;
        }
      }
      /* narrowest */
      if (this.fil_cal_code == 0x0f) {
        this.fil_cal_code = 0;
      }
    }

    await this.r82xx_write_reg_mask(0x0a, filt_q | this.fil_cal_code, 0x1f);

    /* Set BW, Filter_gain, & HP corner */
    await this.r82xx_write_reg_mask(0x0b, hp_cor, 0xef);

    /* Set Img_R */
    await this.r82xx_write_reg_mask(0x07, img_r, 0x80);

    /* Set filt_3dB, V6MHz */
    await this.r82xx_write_reg_mask(0x06, filt_gain, 0x30);

    /* channel filter extension */
    await this.r82xx_write_reg_mask(0x1e, ext_enable, 0x60);

    /* Loop through */
    await this.r82xx_write_reg_mask(0x05, loop_through, 0x80);

    /* Loop through attenuation */
    await this.r82xx_write_reg_mask(0x1f, lt_att, 0x80);

    /* filter extension widest */
    await this.r82xx_write_reg_mask(0x0f, flt_ext_widest, 0x80);

    /* RF poly filter current */
    await this.r82xx_write_reg_mask(0x19, polyfil_cur, 0x60);


    /* Store current standard. If it changes, re-calibrate the tuner */
    this.delsys = delsys;
    this.type = type;
    this.bw = bw;

    return 0;
  }

  async r82xx_set_pll(freq: number): Promise<boolean> {
    const vco_min = 1770000;
    const vco_max = vco_min * 2;

    /* Frequency in kHz */
    const freq_khz = div(freq + 500, 1000);
    const pll_ref = this.xtal;
    const pll_ref_khz = div(pll_ref + 500, 1000);

    await this.r82xx_write_reg_mask(0x10, 0, 0x10);

    /* set pll autotune = 128kHz */
    await this.r82xx_write_reg_mask(0x1a, 0x00, 0x0c);

    /* set VCO current = 100 */
    await this.r82xx_write_reg_mask(0x12, 0x80, 0xe0);

    /* Calculate divider */
    let div_num = 0;
    let mix_div = 2;
    let div_buf = 0;
    while (mix_div <= 64) {
      if (((freq_khz * mix_div) >= vco_min) &&
        ((freq_khz * mix_div) < vco_max)) {
        div_buf = mix_div;
        while (div_buf > 2) {
          div_buf = div_buf >> 1;
          div_num++;
        }
        break;
      }
      mix_div = mix_div << 1;
    }

    const data = await this.r82xx_read(0x00, 5);

    const vco_power_ref = (this.rafael_chip == r82xx_chip.CHIP_R828D)
     ? 1 : 2;

    const vco_fine_tune = (data[4] & 0x30) >> 4;

    if (vco_fine_tune > vco_power_ref) {
      div_num = div_num - 1;
    } else if (vco_fine_tune < vco_power_ref) {
      div_num = div_num + 1;
    }

    await this.r82xx_write_reg_mask(0x10, div_num << 5, 0xe0);

    const vco_freq = freq * mix_div;
    const nint = div(vco_freq, 2 * pll_ref);
    let vco_fra = div(vco_freq - 2 * pll_ref * nint, 1000);

    if (nint > (div(128, vco_power_ref) - 1)) {
      throw new Error("[R82XX] No valid PLL values for " + freq);
    }

    const ni = div(nint - 13, 4);
    const si = nint - 4 * ni - 13;
    await this.r82xx_write(0x14, [ni + (si << 6)]);

    /* pw_sdm */
    const val = (!vco_fra) ? 0x08 : 0x00;
    await this.r82xx_write_reg_mask(0x12, val, 0x08);


    /* sdm calculator */
    let n_sdm = 2;
    let sdm = 0;
    while (vco_fra > 1) {
      if (vco_fra > div(2 * pll_ref_khz, n_sdm)) {
        sdm = sdm + div(32768, div(n_sdm, 2));
        vco_fra = vco_fra - div(2 * pll_ref_khz, n_sdm);
        if (n_sdm >= 0x8000)
          break;
      }
      n_sdm <<= 1;
    }

    await this.r82xx_write(0x16, [sdm >> 8]);

    await this.r82xx_write(0x15, [sdm & 0xff]);

    let data2;
    for (let i = 0; i < 2; i++) {
  //		usleep_range(sleep_time, sleep_time + 1000);

      /* Check if PLL has locked */
      data2 = await this.r82xx_read(0x00, 3);
      if (data2[2] & 0x40) {
        break;
      }

      if (!i) {
        /* Didn't lock. Increase VCO current */
        await this.r82xx_write_reg_mask(0x12, 0x60, 0xe0);
      }
    }

    const locked = !!(data2[2] & 0x40);
    if (!locked) {
      console.warn('PLL NOT locked', 'freq', freq);
      this.has_lock = false;
      return false;
    }else{
      console.info('PLL locked', 'freq', freq);

    }

    this.has_lock = true;

    /* set pll autotune = 8kHz */
    await this.r82xx_write_reg_mask(0x1a, 0x08, 0x08);
    return true;
  }
}


const lut = new Int8Array([ 0x0, 0x8, 0x4, 0xc, 0x2, 0xa, 0x6, 0xe,
  0x1, 0x9, 0x5, 0xd, 0x3, 0xb, 0x7, 0xf ]);

function r82xx_bitrev(byte: number) {
	return (lut[byte & 0xf] << 4) | lut[byte >> 4];
}
