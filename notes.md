# Summmary of register, login, logout user and refresh access tokens :

- hamne abhi tak 3 api endpoints banaye, jaha pr post request krne pr, user register, login ya logout ho sakta hai.

- register ma kya hoga ki frontend se data aayega, ham us data ko validate krenge, and phir db ma object banayenge and phir response ma wo data bhej denge.

- login ma same type ka logic hai, lekin jab ham login krenge, jab ham AT and RT generate krenge and RT ko db ma store krenge and dono AT and RT ko user ki cookies ma set krenge. ab AT ma generally ham non sensitive frequently used data rakhte hai as a payload, and RT ma sird id rkhte hai.

- ab kisi bhi authorized route jse logout pr jaane k liye hame user logged in hai ya nhi ye check krna padega ye ham kse check krenge? ham check krenge ki user k paas AT hai ya nhi. agar hai to ham use decode krenge and then wo decoded information ham req ma add kr denge. 

- why frequently needed info in AT, kai baar kya hoga na ki aapko koi authorized page pr user ka sirf name chaiye hoga ya email ya username jsi chije chaiye hogi, to uske liye ham db query nhi krna chahenge, isliye ham AT k payload ma ye sab info rkhte hai, agar sirf id rkhenge to hame har baar db query krni padegi, jo ham nhi chahte. ab wo authorized page hai isliye uski req ma already user k AT ki decoded info hogi to ham waha se info le sakte hai.

