#pragma once
#include "entities/Civilian.hpp"
namespace rescue {
class RescueManager {
public:
  static std::vector<int> priorities(const std::vector<Civilian> &);
};

} // namespace rescue
