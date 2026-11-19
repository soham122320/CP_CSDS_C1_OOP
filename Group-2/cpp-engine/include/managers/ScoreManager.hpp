#pragma once
#include "core/Types.hpp"
namespace rescue {
class ScoreManager {
  int score_ = 0;

public:
  void rescue(int severity, int bonus) { score_ += severity * 100 + bonus; }
  int value() const { return score_; }
};

} // namespace rescue
