#include "core/DrivingRewards.hpp"
#include <iostream>
#include <stdexcept>
using nlohmann::json;
void check(bool condition, const char *text) {
  if (!condition)
    throw std::runtime_error(text);
}
int main() {
  try {
    json d = {{"mode", "campaign"}, {"level", 1},       {"delivered", 1},
              {"required", 1},      {"collisions", 0},  {"elapsed", 100},
              {"limit", 360},       {"condition", 100}, {"completedBefore", false}};
    auto first = rescue::drivingGrade(d);
    check(first["success"] == true && first["coins"] == 1000 && first["stars"] == 3,
          "first completion reward");
    d["completedBefore"] = true;
    check(rescue::drivingGrade(d)["coins"] == 0, "no repeat farming");
    for (const auto *mode : {"training", "free", "custom"}) {
      d["mode"] = mode;
      d["completedBefore"] = false;
      check(rescue::drivingGrade(d)["coins"] == 0, "no practice or custom reward");
    }
    d["mode"] = "campaign";
    d["collisions"] = 8;
    d["elapsed"] = 350;
    check(rescue::drivingGrade(d)["stars"] == 1, "safety and response rating");
    d["elapsed"] = 361;
    check(rescue::drivingGrade(d)["coins"] == 0 && rescue::drivingGrade(d)["success"] == false,
          "timeout validation");
    d["elapsed"] = 100;
    d["condition"] = 0;
    check(rescue::drivingGrade(d)["stars"] == 0, "unstable patient");
    d["condition"] = 90;
    d["delivered"] = 0;
    check(rescue::drivingGrade(d)["success"] == false, "incomplete rescue");
    d["delivered"] = 2;
    check(rescue::drivingGrade(d).contains("error"), "too many deliveries");
    d["delivered"] = 1;
    d["elapsed"] = 1.5;
    check(rescue::drivingGrade(d).contains("error"), "non-integer inputs");
    check(rescue::drivingPurchase(1, 2000, 2, false)["remaining"] == 500, "purchase balance");
    check(rescue::drivingPurchase(2, 2000, 4, false).contains("error"), "insufficient coins");
    check(rescue::drivingPurchase(3, 4000, 4, false).contains("error"), "level gate");
    check(rescue::drivingPurchase(1, 2000, 2, true).contains("error"), "duplicate purchase");
    check(rescue::drivingPurchase(99, 2000, 2, false).contains("error"), "invalid vehicle");
    std::cout << "Driving rewards: first clear, repeats, modes, stars, invalid results and "
                 "purchases passed\n";
  } catch (const std::exception &e) {
    std::cerr << e.what() << '\n';
    return 1;
  }
}
