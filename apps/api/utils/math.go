package utils

import (
	"math"
)

func RoundToNearest500(num int) int {
	return int(math.Round(float64(num)/500.0) * 500)
}
