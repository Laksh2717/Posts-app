# mongo db aggrgation pipelines :

- Ab hamare paas 2-3 challenges aur hai, pehla hai ki ham no of subscribers of a channel store krne hai, phir hame no of channels which user has subscribes ye store krna hai, and hame ye pata krna hai ki koi particular channel hamne subscribe kiya hai ya nhi taki jab ham us channel pe jaaye to ye pata chale ki hame "subscribe" show krna hai ya "subscribed".

- Ab aao ye soch sakte hai ki ham user model ma hi 2 array create kr lete hai, subscribers and channelSubscribed. And phir isme user ki objectid push krte jaate, lekin kuch channels k millions ma subscribers hote hai, to ek array ma millions of id add krna and phir uspe processing krna i.e. search find update delete ye sab operations krna bahut costly ho jaayega. 

- to ab hame kya krna hai subscription model se jitni bhi information aa rhi hai use users model ma join krna hai kyuki hame at the end kya chaiye, pure user ki info chaiye to usme uske subscribers kitne hai and usne kitne channel subscribe kiye hai ye sab bhi chaiye.

- aggregation pipelines kuch nhi bas stages hote hai. each stage performs an operation on input documents, like pehle stage ma aapne kuch filtering lagayi, to usse kuch documents filter honge, phir next stage ma wahi filtered documents original dataset hai, bas us par filtering lagegi. 

- project ham tab use krte hai jab hame saari fields na return krni ho kuch selected fields hi return krnnni ho. 1 matlab true and 0 matlab false.

- finally ek array return hota hai, to agar last tak multiple chije match krti hai, i.e. saari pipelines agar multiple docs pass krte hai to phir wo sub filtered docs ek array ma return hoge, lekin hamne to finally ek User doc project kiya hai to hame array ma ek hi element milega, agar multiple elements galti se milte hai to ham pehla array a element le lenge.



- writing sub pipelines :

- ab User model ma e filed hai watchHistory jisme video model ki ids hai. to ab hame user ma hye bhi join krna hai. to ham lookup krenge uske liye, lekin notice kro ki video ma ek owner bhi hai jo phirse ek user hai, to ek lookup krne se hame saare videos mil jaayenge lekin us lookup ma hame ek nested lookup krna hoga owner k liye. hame owner bhi chaiye isliye lookup krke join krenge warna agar owner na join krna ho tab to problem hi nhi hai, to ab owner k liye lookup krenge and owner ma bhi hame user model ki saari info chaiye, jitni chaiye hogi utni ham join kr denge.

- ek chij jo interviews ma puchi jaati hai uska concept : 

- req.user._id ye kya deta hai, to ham kahenge ki mongodb ki id milegi, but yaha se jo hame milti hai wo hoti hai string, and ye string mongodb ki id nhi hai, yaha _id ma hame wo string milti hai, agar actually ma hame mongodb ki id chaiye, to uske liye hame objectId(string) ye pura chaiye hoga, lekin ham use kr rhe hai mongoose, to mongoose ma kya hota hai internally, jse hi ham usko _id dete hai i.e. string dete hai to wo automatically use objectId ma convert kr deta hai jo real mongodb ki id hoti hai. 

- lekin ye aggregation pipelines ma ye _id ko lekar dhyan rkhna padta hai, kyuki ye aggregation pipelines ki chije mongoose handle nhi krta, iska code directly hi execute hota hai, to isliye match k andar _id : req.user._id likhoge to error aayega, kyuki hame us id ko convert krna padega kyuki yaha mongoose kaam nhi krega to id convert nhi hogi.

- aur aap ye bhi notice krenge ki ham lookup ma models k name nhi likh rhe, mongo ma wo model ka db kse bana hoga, i.e. plural with lowercase letters wo use kr rhe hai.

- ab jse hi hamne videos k liye lookup kiya, to ham saare watch history k videos mil gaye, lekin abhi isme owner field ma id hogi naki koi data, to hame wo bhi chaiye, to uske liye hame further down ek pipeline likhni hogi, to uske liye lookup ma hi ek piepline likho.

- ab jese hi hamne ye sub pipeline likhi wese hi hamare paas wo owner ki saari details aa gyi i.e. puri user details aa gyi, lekin hame saari info nhi chaiye, hame kuch hi chaiye, ab ham yaha bahar pipeline nhi lagana chahte ham usi field ma pipeline lagana chahte hai, to isliye phir se pipeline ek level deep likhenge.

- EK BAAR WO PIPELINE BAHAR LIKH DE BHI DEKHNA, TAKI PATA CHALE KI KYA FARAK AA RHA HAI.

- ab kya hoga ki owner ma ek array hoga, lekin ham array nhi chahte, hame object chaiye kyuki wo thoda better rhta hai. kyuki usse saari chije clear rhti hai.

- ab ham existing field ko hi overwrite krna chahte hai isliye hame addfields ma owner hi likh liya.

- in routes, agar post use kiya to saari details hi update ho jaayegi, isliye patch use krna.

- pehle verifyjwt aayega, phir multer aayega, kyuki use logged in hona chaiye tabhi ham file lenge.

- /c rkahna hai /channel rakhna hai wo aapke upar hai.

