#pragma once
#include "core/Types.hpp"
namespace rescue {
class DisasterMap {
public:
  std::vector<int> blocked{16, 17, 29, 42, 43, 55, 56, 69, 70, 83, 97, 98, 99};
  bool valid(int c) const { return c >= 0 && c < Cells; }
  bool passable(int c) const {
    return valid(c) && std::find(blocked.begin(), blocked.end(), c) == blocked.end();
  }
  json state() const { return {{"rows", Rows}, {"cols", Cols}, {"blocked", blocked}}; }
};

} // namespace rescue
