#include "core/DrivingRewards.hpp"
#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
std::string evaluateDrivingResult(std::string text) {
  try {
    if (text.size() > 2000)
      return "{\"error\":\"Result too large\"}";
    return rescue::drivingGrade(nlohmann::json::parse(text)).dump();
  } catch (...) {
    return "{\"error\":\"Invalid result payload\"}";
  }
}
std::string purchaseDrivingVehicle(int id, int coins, int level, bool owned) {
  return rescue::drivingPurchase(id, coins, level, owned).dump();
}
EMSCRIPTEN_BINDINGS(driving_rewards) {
  emscripten::function("evaluateDrivingResult", &evaluateDrivingResult);
  emscripten::function("purchaseDrivingVehicle", &purchaseDrivingVehicle);
}
#endif
