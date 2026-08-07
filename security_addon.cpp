#include <napi.h>
#include <string>
#include <chrono>
#include <sstream>

// HARDCODED IN NATIVE BINARY - Very hard to extract via standard decompilation compared to JS
const std::string NATIVE_SECRET = "bgz_super_secret_key_1337_xY!Qz";

// Simple custom hashing function (Fowler-Noll-Vo hash variant)
uint32_t hashString(const std::string& str) {
    uint32_t hash = 2166136261u;
    for (char c : str) {
        hash ^= static_cast<uint32_t>(c);
        hash *= 16777619;
    }
    return hash;
}

// Generate a secure signature for a given payload (e.g., user ID or timestamp)
Napi::Value GenerateSignature(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string payload = info[0].As<Napi::String>().Utf8Value();
    std::string combined = payload + ":" + NATIVE_SECRET;
    
    uint32_t signature = hashString(combined);
    
    std::stringstream ss;
    ss << std::hex << signature;

    return Napi::String::New(env, ss.str());
}

// Verify a signature
Napi::Value VerifySignature(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Two strings expected (payload, signature)").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string payload = info[0].As<Napi::String>().Utf8Value();
    std::string providedSig = info[1].As<Napi::String>().Utf8Value();

    std::string combined = payload + ":" + NATIVE_SECRET;
    uint32_t expectedSignature = hashString(combined);
    
    std::stringstream ss;
    ss << std::hex << expectedSignature;

    bool isValid = (ss.str() == providedSig);
    return Napi::Boolean::New(env, isValid);
}

// Initialize the Addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "generateSignature"),
                Napi::Function::New(env, GenerateSignature));
    exports.Set(Napi::String::New(env, "verifySignature"),
                Napi::Function::New(env, VerifySignature));
    return exports;
}

NODE_API_MODULE(security_addon, Init)
