import serial
import time
import random
import logging
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger("OBDEmulator")

# අනිවාර්යය: ඔබගේ Outgoing Bluetooth COM Port එක මෙහි යොදන්න (උදා: 'COM13')
COM_PORT = 'COM7' 
BAUD_RATE = 38400

class OBDEmulator:
    def __init__(self, port: str, baudrate: int):
        self.port = port
        self.baudrate = baudrate
        self.serial_conn = None
        self.is_running = False

    def start(self):
        try:
            self.serial_conn = serial.Serial(self.port, self.baudrate, timeout=1)
            self.is_running = True
            logger.info("✅ Emulator Started on %s at %s baud.", self.port, self.baudrate)
            
            # WAKE-UP PING (අනිවාර්යයි)
            logger.info("📡 Sending Wake-up Ping to ESP32...")
            self.serial_conn.write(b'\r')
            time.sleep(0.5) 

            self._listen_loop()
        except (OSError, serial.SerialException) as e:
            logger.critical("🔴 System Error: %s", e)
            sys.exit(1)

    def stop(self):
        self.is_running = False
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
        logger.info("🛑 Emulator stopped.")

    def _listen_loop(self):
        buffer = b""
        try:
            while self.is_running:
                if self.serial_conn.in_waiting > 0:
                    char = self.serial_conn.read()
                    if char == b'\r':
                        cmd = buffer.decode('utf-8', errors='ignore').strip()
                        self._process_command(cmd)
                        buffer = b""
                    else:
                        buffer += char
                time.sleep(0.01)
        except (OSError, serial.SerialException) as e:
            logger.error("🔴 Stream Error: %s", e)
            self.stop()

    def _process_command(self, cmd: str):
        logger.info("📥 RX: %s", cmd)
        response = "NO DATA\r\n>"

        if cmd == "ATZ":
            response = "ELM327 v1.5\r\n>"
        elif cmd in ["ATE0", "ATSP0", "ATL0"]:
            response = "OK\r\n>"
        elif cmd == "010C": # RPM
            rpm = random.randint(2400, 2500) * 4
            response = f"41 0C {rpm>>8:02X} {rpm&0xFF:02X} \r\n>"
        elif cmd == "010D": # Speed
            speed = random.randint(75, 80)
            response = f"41 0D {speed:02X} \r\n>"
        elif cmd == "0105": # Temp
            temp = random.randint(90, 94) + 40
            response = f"41 05 {temp:02X} \r\n>"
        elif cmd == "0104": # Engine Load
            load_val = int((random.randint(20, 60) * 255) / 100)
            response = f"41 04 {load_val:02X} \r\n>"
        elif cmd == "0110": # MAF Air Flow Rate
            maf_val = random.randint(1000, 3000) # 10.00 to 30.00 g/s (*100)
            response = f"41 10 {maf_val>>8:02X} {maf_val&0xFF:02X} \r\n>"
        elif cmd == "0111": # Throttle Position
            throttle_val = int((random.randint(10, 40) * 255) / 100)
            response = f"41 11 {throttle_val:02X} \r\n>"
        elif cmd == "03": # DTC Faults
            response = "43 02 03 01 01 71 00 00 \r\n>"

        logger.info("📤 TX: %s", response.strip())
        self.serial_conn.write(response.encode('utf-8'))

if __name__ == "__main__":
    emulator = OBDEmulator(COM_PORT, BAUD_RATE)
    try:
        emulator.start()
    except KeyboardInterrupt:
        emulator.stop()