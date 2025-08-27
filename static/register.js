document.addEventListener('DOMContentLoaded',  () =>{
    const register = document.getElementById('register')

    register.addEventListener('submit', async (e) =>{
        e.preventDefault()
        const formdata =new FormData(register)

        const name = formdata.get('name')
        const email =formdata.get('email')
        const password =formdata.get('password')
        const confirmPassword = formdata.get('confirmPassword')

        if (password !== confirmPassword) {
            alert('passwords do not match')
            return;
        }

        try {
            const response = await fetch('/todo/register',{
                method:'POST',
                headers:
                {'content-type':'application/json',},
                body:JSON.stringify({name,email,password,confirmPassword})
            })
            if (response.ok) {
                alert('registration successful')
            }
            else{
                alert('registration failed')
            }
            
        } catch (error) {
            console.error('error during registration', error)
        }

    })
})