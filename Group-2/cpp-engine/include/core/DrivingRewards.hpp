#pragma once
#include "json.hpp"
namespace rescue {
// Small C++ policy module for the React/Three.js driving mode. Local, not anti-cheat.
inline nlohmann::json drivingGrade(const nlohmann::json &d) {
  using nlohmann::json;
  for (const auto *key :
       {"level", "delivered", "required", "collisions", "elapsed", "limit", "condition"})
    if (!d.contains(key) || !d[key].is_number_integer() || d[key] < 0 || d[key] > 100000)
      return {{"error", "Invalid mission result"}};
  if (!d.contains("completedBefore") || !d["completedBefore"].is_boolean())
    return {{"error", "Invalid completion ledger"}};
  int level = d["level"], delivered = d["delivered"], required = d["required"],
      hits = d["collisions"], elapsed = d["elapsed"], limit = d["limit"],
      condition = d["condition"];
  if (level < 1 || level > 7 || required < 1 || required > 6 || delivered > required || limit < 1 ||
      condition > 100)
    return {{"error", "Result out of range"}};
  const std::string mode = d.value("mode", std::string("campaign"));
  if (mode != "campaign" && mode != "custom" && mode != "training" && mode != "free")
    return {{"error", "Unknown game mode"}};
  bool success = delivered == required && elapsed <= limit && condition > 0;
  int stars = success ? 1 + (hits <= 2 && condition >= 65) + (elapsed <= limit * 0.75) : 0;
  return {{"success", success},
          {"stars", stars},
          {"coins", success && mode == "campaign" && !d["completedBefore"].get<bool>() ? 1000 : 0}};
}
inline nlohmann::json drivingPurchase(int id, int coins, int availableLevel, bool owned) {
  const int costs[] = {0, 1500, 2500, 4000}, levels[] = {1, 2, 4, 6};
  if (id < 0 || id > 3 || coins < 0 || coins > 7000 || availableLevel < 1 || availableLevel > 7)
    return {{"error", "Invalid purchase"}};
  if (owned)
    return {{"error", "This vehicle is already in your garage."}};
  if (availableLevel < levels[id])
    return {{"error", "Complete more levels to unlock this vehicle."}};
  if (coins < costs[id])
    return {{"error", "Not enough rescue coins yet."}};
  return {{"approved", true}, {"remaining", coins - costs[id]}};
}
} // namespace rescue
