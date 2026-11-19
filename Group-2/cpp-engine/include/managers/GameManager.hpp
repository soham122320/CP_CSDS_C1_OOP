#pragma once
#include "core/Game.hpp"
namespace rescue {
// Replay-based persistence: untrusted saved state is never assigned to engine fields.
class GameManager {
  Game game_;
  json commands_ = json::array();
  json apply(const std::string &, int, int);

public:
  json command(const std::string &, int = -1, int = -1);
  json state() const { return game_.state(); }
  std::string save() const;
  void load(const std::string &);
  void setScenario(const std::string &);
  std::string exportScenario() const;
  void restart();
  int score() const { return game_.score.value(); }
};
} // namespace rescue
