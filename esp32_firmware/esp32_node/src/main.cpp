#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <BluetoothSerial.h>
#include <WiFi.h>
#include <PubSubClient.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

const char* mqtt_server = "178.128.103.197"; 
const uint16_t mqtt_port = 1883;
const char* topic_publish = "telemetry/raw";

const char* ssid = "Nipuna";
const char* password = "12345678";

// පින්තූරයෙන් ලබාගත් නිශ්චිත MAC ලිපිනය
uint8_t obd_mac[6] = {0xCC, 0xD3, 0x48, 0xC3, 0xF4, 0x59}; 

BluetoothSerial SerialBT;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastSendTime = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long SEND_INTERVAL = 1000; 

int rpm = 0, speed = 0, temp = 0;
int engine_load = 0, throttle = 0;
float maf = 0.0;
String current_dtc = "NONE";
bool is_obd_initialized = false;

void drawDashboard();
String sendOBD(String cmd, unsigned long timeout);
void initOBD();

boolean reconnectMQTT() {
    if (mqttClient.connect("ESP32_PRO_DIAG_CLIENT")) {
        Serial.println("[MQTT] Connected");
        return true;
    }
    return false;
}

String sendOBD(String cmd, unsigned long timeout) {
    if (!SerialBT.connected()) return ""; 
    while(SerialBT.available()) SerialBT.read();
    SerialBT.print(cmd + "\r"); 
    
    String res = "";
    unsigned long t = millis();
    while (millis() - t < timeout) { 
        if (SerialBT.available()) {
            char c = SerialBT.read();
            if (c == '>') break; 
            res += c;
        }
    }
    res.replace("\r", ""); 
    res.replace("\n", "");
    res.replace(" ", ""); 
    return res;
}

void initOBD() {
    Serial.println("Initializing ELM327 Emulator...");
    sendOBD("ATZ", 2000);   
    delay(500);
    sendOBD("ATE0", 1000);  
    sendOBD("ATL0", 1000);  
    sendOBD("ATSP0", 2000); 
    is_obd_initialized = true;
}

void drawDashboard() {
    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(0, 0);
    display.printf("%d KMH", speed);
    display.setCursor(0, 20);
    display.printf("%d RPM", rpm);
    display.setTextSize(1);
    display.setCursor(0, 42);
    display.printf("TEMP: %d C", temp);
    display.setCursor(0, 54);
    display.print("DTC: ");
    display.print(current_dtc);
    display.display();
}

void setup() {
    Serial.begin(115200);

    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        for(;;); 
    }

    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 10);
    display.println("PRO-DIAG CORE V9.0");
    display.setCursor(0, 30);
    display.println("CONNECTING HOTSPOT...");
    display.display();

    WiFi.begin(ssid, password); 
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("\nWiFi Connected");

    mqttClient.setServer(mqtt_server, mqtt_port);
    mqttClient.setKeepAlive(60); 

    SerialBT.begin("ESP32_MASTER", true); 
    SerialBT.enableSSP();
}

void loop() {
    if (!mqttClient.connected()) {
        unsigned long now = millis();
        if (now - lastReconnectAttempt > 5000) { 
            lastReconnectAttempt = now;
            if (reconnectMQTT()) {
                lastReconnectAttempt = 0;
            }
        }
    } else {
        mqttClient.loop();
    }

    if (!SerialBT.connected()) {
        display.clearDisplay();
        display.setTextSize(1);
        display.setCursor(0, 10);
        display.println("WIFI: CONNECTED");
        display.setCursor(0, 30);
        display.println("CONNECTING MAC...");
        display.display();
        
        Serial.println("Connecting to OBD MAC...");
        // MAC ලිපිනය හරහා සම්බන්ධ වීම
        if (SerialBT.connect(obd_mac)) {
            Serial.println("OBD Connected Successfully!");
            is_obd_initialized = false; 
        } else {
            Serial.println("OBD Connection Failed. Retrying in 2s...");
            delay(2000);
        }
        return; 
    }

    if (!is_obd_initialized) {
        initOBD();
    }

    // RPM Parsing
    String r = sendOBD("010C", 1000); 
    r.toUpperCase(); 
    if (r.indexOf("410C") != -1 && r.length() >= (r.indexOf("410C") + 8)) {
        int idx = r.indexOf("410C") + 4;
        long A = strtol(r.substring(idx, idx+2).c_str(), NULL, 16);
        long B = strtol(r.substring(idx+2, idx+4).c_str(), NULL, 16);
        rpm = (A * 256 + B) / 4;
    }

    // Speed Parsing
    String s = sendOBD("010D", 500);
    s.toUpperCase();
    if (s.indexOf("410D") != -1 && s.length() >= (s.indexOf("410D") + 6)) {
        int idx = s.indexOf("410D") + 4;
        speed = strtol(s.substring(idx, idx+2).c_str(), NULL, 16);
    }

    // Temp Parsing
    String t = sendOBD("0105", 500);
    t.toUpperCase();
    if (t.indexOf("4105") != -1 && t.length() >= (t.indexOf("4105") + 6)) {
        int idx = t.indexOf("4105") + 4;
        temp = strtol(t.substring(idx, idx+2).c_str(), NULL, 16) - 40;
    }

    // Engine Load Parsing
    String l = sendOBD("0104", 400);
    l.toUpperCase();
    if (l.indexOf("4104") != -1 && l.length() >= (l.indexOf("4104") + 6)) {
        int idx = l.indexOf("4104") + 4;
        long A = strtol(l.substring(idx, idx+2).c_str(), NULL, 16);
        engine_load = (A * 100) / 255;
    }

    // MAF Rate Parsing
    String m = sendOBD("0110", 400);
    m.toUpperCase();
    if (m.indexOf("4110") != -1 && m.length() >= (m.indexOf("4110") + 8)) {
        int idx = m.indexOf("4110") + 4;
        long A = strtol(m.substring(idx, idx+2).c_str(), NULL, 16);
        long B = strtol(m.substring(idx+2, idx+4).c_str(), NULL, 16);
        maf = ((A * 256.0) + B) / 100.0;
    }

    // Throttle Position Parsing
    String tp = sendOBD("0111", 400);
    tp.toUpperCase();
    if (tp.indexOf("4111") != -1 && tp.length() >= (tp.indexOf("4111") + 6)) {
        int idx = tp.indexOf("4111") + 4;
        long A = strtol(tp.substring(idx, idx+2).c_str(), NULL, 16);
        throttle = (A * 100) / 255;
    }

    // DTC Parsing
    String dtc_res = sendOBD("03", 800);
    dtc_res.toUpperCase();
    if (dtc_res.indexOf("43") != -1 && dtc_res.length() >= (dtc_res.indexOf("43") + 8)) {
        int idx = dtc_res.indexOf("43") + 4; 
        current_dtc = "P" + dtc_res.substring(idx, idx+4);
    } else {
        current_dtc = "NONE";
    }

    drawDashboard();

    if (millis() - lastSendTime > SEND_INTERVAL) {
        StaticJsonDocument<256> doc;
        doc["engine"]["rpm"] = rpm;
        doc["engine"]["coolant_temp"] = temp;
        doc["engine"]["load"] = engine_load;
        doc["engine"]["maf"] = maf;
        doc["engine"]["throttle"] = throttle;
        doc["speed"]["vehicle_speed"] = speed;
        doc["diagnostics"]["dtc"][0] = current_dtc;
        
        String out;
        serializeJson(doc, out);
        if(mqttClient.connected()) {
             mqttClient.publish(topic_publish, out.c_str());
        }
        lastSendTime = millis();
    }
}