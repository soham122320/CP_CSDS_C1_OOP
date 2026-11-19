#include "core/Engine.hpp"
#include <stdexcept>
namespace rescue {
json GameManager::apply(const std::string &action, int a, int b) {
  if (action == "start")
    game_.start();
  else if (action == "pause")
    game_.pause();
  else if (action == "tick")
    game_.tick();
  else if (action == "select")
    game_.selectVehicle(a);
  else if (action == "assign")
    game_.assign(a, b);
  else if (action == "path")
    return game_.calculate(a, b).state();
  else if (action == "move")
    game_.moveVehicle(a);
  else
    throw std::runtime_error("Unknown command");
  return game_.state();
}
json GameManager::command(const std::string &action, int a, int b) {
  if (commands_.size() >= 20000)
    throw std::runtime_error("Command limit reached. Restart the operation.");
  auto result = apply(action, a, b);
  commands_.push_back({action, a, b});
  return result;
}
std::string GameManager::save() const {
  return json({{"version", 2},
               {"scenario", game_.scenario.contains("civilians") ? game_.scenario : json(nullptr)},
               {"commands", commands_}})
      .dump();
}
void GameManager::load(const std::string &text) {
  if (text.size() > 2000000)
    throw std::runtime_error("Save file too large");
  auto data = json::parse(text);
  if ((data.at("version") != 1 && data.at("version") != 2) || !data.at("commands").is_array() ||
      data["commands"].size() > 20000)
    throw std::runtime_error("Invalid save format");
  GameManager candidate;
  if (data.at("version") == 2 && !data.at("scenario").is_null())
    candidate.setScenario(data.at("scenario").dump());
  for (const auto &entry : data["commands"]) {
    if (!entry.is_array() || entry.size() != 3 || !entry[0].is_string() ||
        !entry[1].is_number_integer() || !entry[2].is_number_integer())
      throw std::runtime_error("Invalid saved command");
    candidate.command(entry[0], entry[1], entry[2]);
  }
  // Atomic replacement only after every command validates successfully.
  *this = std::move(candidate);
}
void GameManager::setScenario(const std::string &text) {
  if (text.size() > 16000)
    throw std::runtime_error("Mission code too large.");
  GameManager candidate;
  candidate.game_.configure(json::parse(text));
  *this = std::move(candidate);
}
std::string GameManager::exportScenario() const {
  if (!game_.scenario.contains("civilians"))
    throw std::runtime_error("Choose a level or create a challenge before sharing.");
  return game_.scenario.dump();
}
void GameManager::restart() {
  if (game_.scenario.contains("civilians"))
    setScenario(game_.scenario.dump());
  else
    *this = GameManager();
}
} // namespace rescue
