import { TunnerR82xx, TunnerCtx } from "./tunners/r82xx";

var nu = 1;
const R82XX_CHECK_VAL = 0x69;

const R82XX_IF_FREQ = 3570000;

const FIR_DEFAULT = [
	-54, -36, -41, -40, -32, -14, 14, 53,	/* 8 bit signed */
	101, 156, 215, 273, 327, 372, 404, 421	/* 12 bit signed */
];

const DEF_RTL_XTAL_FREQ = 28800000;
const MIN_RTL_XTAL_FREQ = (DEF_RTL_XTAL_FREQ - 1000);
const MAX_RTL_XTAL_FREQ	= (DEF_RTL_XTAL_FREQ + 1000);


const enum UsbReg {
	SYSCTL		= 0x2000,
	CTRL		= 0x2010,
	STAT		= 0x2014,
	EPA_CFG		= 0x2144,
	EPA_CTL		= 0x2148,
	EPA_MAXPKT		= 0x2158,
	EPA_MAXPKT_2	= 0x215a,
	EPA_FIFO_CFG	= 0x2160,
};

const enum SysReg {
	DEMOD_CTL		= 0x3000,
	GPO			= 0x3001,
	GPI			= 0x3002,
	GPOE			= 0x3003,
	GPD			= 0x3004,
	SYSINTE			= 0x3005,
	SYSINTS			= 0x3006,
	GP_CFG0			= 0x3007,
	GP_CFG1			= 0x3008,
	SYSINTE_1		= 0x3009,
	SYSINTS_1		= 0x300a,
	DEMOD_CTL_1		= 0x300b,
	IR_SUSPEND		= 0x300c,
};

const enum Block {
	DEMODB = 0,
	USBB = 1,
	SYSB = 2,
	TUNB = 3,
	ROMB = 4,
	IRB = 5,
	IICB = 6,
};

const enum Tunner {
  UNKNOWN = 0,
	E4000,
	FC0012,
	FC0013,
	FC2580,
	R820T,
	R828D
};


const TUNNERS = {
  [Tunner.R820T]: TunnerR82xx
};



export class Device {
  dev: any;
  //struct libusb_device_handle *devh;
  xfer_buf_num: number = 0;
  xfer_buf_len: number = 0;
  //struct libusb_transfer **xfer;
  //unsigned char **xfer_buf;
  //rtlsdr_read_async_cb_t cb;
  //void *cb_ctx;
  //enum rtlsdr_async_status async_status;
  async_cancel: number;
  /* rtl demod context */
  rate: number = 0; /* Hz */
  rtl_xtal: number = 0; /* Hz */
  // int fir[FIR_LEN];
  direct_sampling = false;
  /* tuner context */
  // enum rtlsdr_tuner tuner_type;
  tunner: TunnerCtx;
  // rtlsdr_tuner_iface_t *tuner;
  tun_xtal: number = 0; /* Hz */
  freq: number = 0; /* Hz */
  bw: number = 0;
  offs_freq: number = 0; /* Hz */
  corr: number = 0; /* ppm */
  gain: number = 0; /* tenth dB */

  /* status */
  dev_lost: number = 0;
  driver_active: number = 0;
  xfer_errors: number = 0;

  async connect() {
    const usb = (navigator as any).usb;
    const device = await usb.requestDevice({ filters: [{ vendorId: 0xbda }] })
    console.log(device.productName);      // "Arduino Micro"
    console.log(device.manufacturerName); // "Arduino LLC"

    this.dev = device;

    await device.open();
    await device.selectConfiguration(1)
    await device.claimInterface(0);
    await device.reset();

    // dummy test
    await this.write(Block.USBB, UsbReg.SYSCTL, [9]);

    this.rtl_xtal = DEF_RTL_XTAL_FREQ;

    // init baseband
    await this.basebandDevice();
    this.dev_lost = 0;

    /* Probe tuners */
    await this.set_i2c_repeater(true);
    console.log('done');
    const tunner = await this.findTunner();
    this.tunner = new TUNNERS[tunner](this);

    this.tun_xtal = this.rtl_xtal;
    if(tunner === Tunner.R820T) {
      console.log('FOUND Tunner.R820T');
      /* disable Zero-IF mode */
      await this.write_demod(1, 0xb1, [0x1a]);

      /* only enable In-phase ADC input */
      await this.write_demod(0, 0x08, [0x4d]);

      /* the R82XX use 3.57 MHz IF for the DVB-T 6 MHz mode, and
      * 4.57 MHz for the 8 MHz mode */
      await this.set_if_freq(R82XX_IF_FREQ);

      /* enable spectrum inversion */
      await this.write_demod(1, 0x15, [0x01]);
    }
    await this.tunner.init();
    await this.set_i2c_repeater(false);
  }

  // set_tuner_gain_mode
  async setAutoGain() {
    await this.set_i2c_repeater(true);
    await this.tunner.set_auto_gain();
    await this.set_i2c_repeater(false);
  }

  // set_tuner_gain
  async setTunnerGain(gain: number) {
    await this.set_i2c_repeater(true);
    await this.tunner.set_gain(gain);
    await this.set_i2c_repeater(false)
  }

  // set_freq_correction
  async setFreqCorrection(ppm: number) {
    const offs = ppm * (-1) * (1<<24) / 1000000;

    let tmp = offs & 0xff;
    await this.write_demod(1, 0x3f, [tmp]);
    tmp = (offs >> 8) & 0x3f;
    await this.write_demod(1, 0x3e, [tmp]);
  }

  async setBandwidth(bw: number) {
    await this.set_i2c_repeater(true);
    await this.tunner.set_bw(bw > 0 ? bw : this.rate);
    await this.set_i2c_repeater(false);
    this.bw = bw;
  }

  async readData(len: number = 16 * 16384): Promise<DataView> {
    const result = await this.dev.transferIn(0x1, len);
    if(result.status !== 'ok' || !result.data) {
      throw 'bulk read failed' + result.status;
    }
    return result.data;
  }
  // set_agc_mode
  async setAgcMode(agc) {}

  // set_center_freq
  async setCentralFreq(freq: number) {
    if (this.direct_sampling) {
      await this.set_if_freq(freq);
    } else {
      await this.set_i2c_repeater(true);
      await this.tunner.set_freq(freq - this.offs_freq);
      await this.set_i2c_repeater(false);
    }
    this.freq = freq;
  }

  // set_sample_rate
  async setSampleRate(samp_rate: number) {
    /* check if the rate is supported by the resampler */
    if ((samp_rate <= 225000) || (samp_rate > 3200000) ||
       ((samp_rate > 300000) && (samp_rate <= 900000))) {
        throw new Error("Invalid sample rate: " + samp_rate);
    }

    let rsamp_ratio = (this.rtl_xtal * (1<<22)) / samp_rate;
    rsamp_ratio &= 0x0ffffffc;

    const real_rsamp_ratio = rsamp_ratio | ((rsamp_ratio & 0x08000000) << 1);
    const real_rate = ((this.rtl_xtal * (1<<22)) / real_rsamp_ratio);

    if ( samp_rate !== real_rate ) {
      console.warn("Exact sample rate is: ", real_rate);
    }
    this.rate = real_rate | 0;

    await this.set_i2c_repeater(true);
    await this.tunner.set_bw(this.bw > 0 ? this.bw : this.rate);
    await this.set_i2c_repeater(false);

    let tmp = (rsamp_ratio >> 16);
    console.log(tmp);
    await this.write_demod(1, 0x9f, [tmp >> 8, tmp & 0xff]); // REVIEW

    tmp = rsamp_ratio & 0xffff;
    console.log(tmp);
    await this.write_demod(1, 0xa1, [tmp >> 8, tmp & 0xff]); // REVIEW

    await this.setFreqCorrection(this.corr);

    /* reset demod (bit 3, soft_rst) */
    await this.write_demod(1, 0x01, [0x14]);
    await this.write_demod(1, 0x01, [0x10]);

    /* recalculate offset frequency if offset tuning is enabled */
    if (this.offs_freq > 0) {
      await this.rtlsdr_set_offset_tuning(true);
    }
  }

  async rtlsdr_set_offset_tuning(on: boolean) {
    // if ((this.tuner_type === RTLSDR_TUNER_R820T) ||
    //     (this.tuner_type === RTLSDR_TUNER_R828D)) {
    //       throw new Error('tunner type is wrong');
    // }

    if (this.direct_sampling) {
      throw new Error('direct sampling is enabled');
    }

    /* based on keenerds 1/f noise measurements */
    this.offs_freq = on ? ((this.rate / 2) * 170 / 100) : 0;
    await this.set_if_freq(this.offs_freq);

    await this.set_i2c_repeater(true);

    let bw;
    if (on) {
      bw = 2 * this.offs_freq;
    } else if (this.bw > 0) {
      bw = this.bw;
    } else {
      bw = this.rate;
    }
    await this.tunner.set_bw(bw);

    await this.set_i2c_repeater(false);

    if (this.freq > this.offs_freq) {
      await this.setCentralFreq(this.freq);
    }
  }

  async resetBuffer() {
    await this.write(Block.USBB, UsbReg.EPA_CTL, [0x10, 0x02]); // REVIEW 0x1002
    await this.write(Block.USBB, UsbReg.EPA_CTL, [0x00, 0x00]); // REVIEW 0x0000
  }

  private async basebandDevice() {
    // initialize USB
    await this.write(Block.USBB, UsbReg.SYSCTL, [0x09]);
    await this.write(Block.USBB, UsbReg.EPA_MAXPKT, [0x0, 0x2]); // REVIEW 0x0002
    await this.write(Block.USBB, UsbReg.EPA_CTL, [0x10, 0x02]); // REVIEW 0x1002

    // poweron demod
    await this.write(Block.SYSB, SysReg.DEMOD_CTL_1, [0x22]);
    await this.write(Block.SYSB, SysReg.DEMOD_CTL, [0xe8]);

    // reset demod (bit 3, soft_rst)
    await this.write_demod(1, 0x01, [0x14]);
    await this.write_demod(1, 0x01, [0x10]);

    // disable spectrum inversion and adjacent channel rejection
    await this.write_demod(1, 0x15, [0x00]);
    await this.write_demod(1, 0x16, [0x00, 0x00]);

    /* clear both DDC shift and IF frequency registers  */
    for (let i = 0; i < 6; i++) {
      await this.write_demod(1, 0x16 + i, [0x00]);
    }

    await this.set_fir();

    /* enable SDR mode, disable DAGC (bit 5) */
    await this.write_demod(0, 0x19, [0x05]);

    /* init FSM state-holding register */
    await this.write_demod(1, 0x93, [0xf0]);
    await this.write_demod(1, 0x94, [0x0f]);

    /* disable AGC (en_dagc, bit 0) (this seems to have no effect) */
    await this.write_demod(1, 0x11, [0x00]);

    /* disable RF and IF AGC loop */
    await this.write_demod(1, 0x04, [0x00]);

    /* disable PID filter (enable_PID = 0) */
    await this.write_demod(0, 0x61, [0x60]);

    /* opt_adc_iq = 0, default ADC_I/ADC_Q datapath */
    await this.write_demod(0, 0x06, [0x80]);

    /* Enable Zero-IF mode (en_bbin bit), DC cancellation (en_dc_est),
    * IQ estimation/compensation (en_iq_comp, en_iq_est) */
    await this.write_demod(1, 0xb1, [0x1b]);

    /* disable 4.096 MHz clock output on pin TP_CK0 */
    await this.write_demod(0, 0x0d, [0x83]);
  }

  private async findTunner() {
    const E4K_I2C_ADDR = 0xc8;
    const E4K_CHECK_ADDR = 0x02;
    const E4K_CHECK_VAL =	0x40;

    const FC0013_I2C_ADDR	= 0xc6;
    const FC0013_CHECK_ADDR =0x00;
    const FC0013_CHECK_VAL = 0xa3;

    // try {
    //   const reg = await this.read_i2c_reg(E4K_I2C_ADDR, E4K_CHECK_ADDR);
    //   if (reg === E4K_CHECK_VAL) {
    //     throw new Error('not implemented');
    //   }
    // }catch {
    //   await this.dev.clearHalt("in", 1);
    // }

    // try {
    //   const reg = await this.read_i2c_reg(FC0013_I2C_ADDR, FC0013_CHECK_ADDR);
    //   if (reg === FC0013_CHECK_VAL) {
    //     throw new Error('not implemented');
    //   }
    // } catch {
    //   await this.dev.clearHalt("in", 1);
    // }

    let reg = await this.read_i2c_reg(0x34, 0x00);
    if (reg === R82XX_CHECK_VAL) {
      return Tunner.R820T;
    }
    return Tunner.UNKNOWN;
  }

  private async set_fir() {
    const fir = new Uint8Array(20);

    /* format: int8_t[8] */
    for (let i = 0; i < 8; ++i) {
      const val = FIR_DEFAULT[i];
      if (val < -128 || val > 127) {
        return -1;
      }
      fir[i] = val;
    }
    /* format: int12_t[8] */
    for (let i = 0; i < 8; i += 2) {
      const val0 = FIR_DEFAULT[8+i];
      const val1 = FIR_DEFAULT[8+i+1];
      if (val0 < -2048 || val0 > 2047 || val1 < -2048 || val1 > 2047) {
        return -1;
      }
      fir[8+i*3/2] = val0 >> 4;
      fir[8+i*3/2+1] = (val0 << 4) | ((val1 >> 8) & 0x0f);
      fir[8+i*3/2+2] = val1;
    }

    for (let i = 0; i < fir.byteLength; i++) {
      await this.write_demod(1, 0x1c + i, [fir[i]]);
    }
    return 0;
  }

  async set_if_freq(freq: number) {
    /* read corrected clock value */
    const rtl_xtal = this.get_xtal_rtl_freq();

    const if_freq = ((freq * (1<<22)) / rtl_xtal) * (-1);

    let tmp = (if_freq >> 16) & 0x3f;
    await this.write_demod(1, 0x19, [tmp]);

    tmp = (if_freq >> 8) & 0xff;
    await this.write_demod(1, 0x1a, [tmp]);

    tmp = if_freq & 0xff;
    await this.write_demod(1, 0x1b, [tmp]);
  }

  get_xtal_rtl_freq() {
    return APPLY_PPM_CORR(this.rtl_xtal, this.corr);
  }

  get_xtal_tun_freq() {
    return APPLY_PPM_CORR(this.tun_xtal, this.corr);
  }

  async write(block: Block, addr: UsbReg | SysReg, data: number[] | Uint8Array) {
    const index = (block << 8) | 0x10;
    await this.aux_write(addr, index, data);
  }

  read(block: Block, addr: UsbReg | SysReg, length: number): Promise<DataView> {
    const index = (block << 8);
    return this.aux_read(addr, index, length);
  }

  private async write_demod(page: number, addr, data: number[] | Uint8Array) {
    const index = 0x10 | page;
    addr = (addr << 8) | 0x20;

    await this.aux_write(addr, index, data);
    await this.read_demod_reg(0x0a, 0x01, 1);
  }

  private read_demod_reg(page: number, addr: number, len: number) {
    addr = (addr << 8) | 0x20;
    return this.aux_read(addr, page, len);
  }

  write_i2c_reg(addr: number, reg: number, value: number) {
    return this.write(Block.IICB, addr, [reg, value]);
  }

  write_i2c_array(addr: number, reg: number, data: Uint8Array) {
    const buf = new Uint8Array(data.byteLength + 1);
    buf[0] = reg;
    buf.set(data, 1);
    // console.log("t", Array.from(buf).map(i => i.toString(16)).join(''));

    return this.write(Block.IICB, addr, buf);
  }

  async read_i2c_reg(addr: number, reg: number): Promise<number> {
    const data = await this.read_i2c_array(addr, reg, 1);
    return data.getInt8(0);
  }

  async read_i2c_array(addr: number, reg: number, len: number): Promise<DataView> {
    await this.write(Block.IICB, addr, [reg]);
    return this.read(Block.IICB, addr, len);
  }

  private async aux_write(addr: number, index: number, data: number[] | Uint8Array): Promise<number> {
    const buffer = (data instanceof Uint8Array)
      ? data
      : new Uint8Array(data);

    // console.debug('OUT', 'wValue', '0x'+addr.toString(16), 'wIndex', index, 'len', buffer.byteLength);
    const result = await this.dev.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0,
      value: addr,
      index: index
    }, buffer);

    if(result.status !== 'ok') {
      throw new Error('write: ' + result.status);
    }
    if(result.bytesWritten !== buffer.byteLength) {
      throw new Error('write wrong bytes');
    }
    const i = (nu++)*2;
    // if (i === 430) {
    //   debugger;
    // }
    console.log('out', i, addr.toString(10), index.toString(10), buffer);
    return result.bytesWritten;
  }

  private async aux_read(addr: number, index: number, len: number): Promise<DataView> {
    // console.debug('IN ', 'wValue', '0x'+addr.toString(16), 'wIndex', index);
    const result = await this.dev.controlTransferIn({
      requestType: 'vendor',
      recipient: 'device',
      request: 0,
      value: addr,
      index: index
    }, len);

    if(result.status !== 'ok' || !result.data) {
      throw new Error('read failed');
    }
    if(result.data.byteLength !== len) {
      throw new Error('read wrong bytes');
    }
    const i = (nu++)*2;
    // if (i === 234) {
    //   debugger;
    // }
    console.log('in', i, addr.toString(16), index.toString(16), new Uint8Array(result.data.buffer));
    return result.data;
  }

  private set_i2c_repeater(on: boolean) {
    return this.write_demod(1, 0x01, on ? [0x18] : [0x10]);
  }

}


function APPLY_PPM_CORR(val,ppm) {
  return (val * (1.0 + ppm / 1e6)) | 0;
}
