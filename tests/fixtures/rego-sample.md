```rego
package inktty

default allow := false

allow if input.user == "alice"
```
