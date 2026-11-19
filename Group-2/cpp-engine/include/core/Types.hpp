#pragma once
#include "json.hpp"
#include <algorithm>
#include <memory>
#include <queue>
#include <string>
#include <vector>
using json = nlohmann::json;
namespace rescue {
constexpr int Rows = 9, Cols = 13, Cells = Rows * Cols;
enum class Phase { Ready, Running, Paused, Finished };

} // namespace rescue
